use crate::channel::Channel;
use crate::event::{
    AudioCommand, OP_CONFIG, OP_METRONOME, OP_NOTE_OFF, OP_NOTE_ON, OP_PARAM, OP_PLAY_STATE,
    OP_POSITION, OP_TRANSPORT,
};
use crate::metronome::Metronome;
use crate::voice::Voice;

/// The maximum number of concurrent polyphonic voices supported by the engine.
pub const MAX_VOICES: usize = 32;

/// The maximum number of mixer channels supported.
pub const MAX_CHANNELS: usize = 16;

/// The core Audio Engine responsible for managing voices, channels, and synthesis.
///
/// It processes audio commands from the host, manages the allocation of polyphonic voices,
/// and mixes the final audio output block.
pub struct Engine {
    /// Fixed pool of polyphonic voices.
    voices: [Voice; MAX_VOICES],
    /// Fixed array of mixer channels.
    channels: [Channel; MAX_CHANNELS],
    /// Integrated metronome for click track generation.
    metronome: Metronome,
    /// The current audio sample rate in Hz.
    sample_rate: f32,
    /// Round-robin index for the next voice allocation.
    next_voice_idx: usize,

    // Transport State
    /// Current playback tempo in Beats Per Minute.
    tempo: f32,
    /// Current playback position in beats (floating point).
    current_beat: f64,
    /// Calculated number of samples per beat based on tempo and sample rate.
    samples_per_beat: f64,
    /// The numerator of the time signature (e.g., 4 in 4/4). Used for accent logic.
    time_signature_numerator: usize,
    /// Whether the transport is actively playing.
    is_playing: bool,
}

impl Engine {
    /// Creates a new Audio Engine instance.
    ///
    /// # Arguments
    ///
    /// * `sample_rate` - The initial sample rate in Hz.
    pub fn new(sample_rate: f32) -> Self {
        let voices = std::array::from_fn(|_| Voice::new(sample_rate));

        // Initialize channel array manually to avoid Copy trait issues if Channel changes.
        // Using a fixed size array initialization approach.
        let mut channels = Vec::with_capacity(MAX_CHANNELS);
        for _ in 0..MAX_CHANNELS {
            channels.push(Channel::new());
        }
        // Convert Vec to Array (safe because we know the size matches)
        let channels: [Channel; MAX_CHANNELS] = channels
            .try_into()
            .unwrap_or_else(|_| panic!("Failed to init channels"));

        let tempo = 120.0;
        let samples_per_beat = (sample_rate as f64 * 60.0) / tempo as f64;

        Engine {
            voices,
            channels,
            metronome: Metronome::new(sample_rate),
            sample_rate,
            next_voice_idx: 0,
            tempo,
            current_beat: 0.0,
            samples_per_beat,
            time_signature_numerator: 4,
            is_playing: false,
        }
    }

    /// Updates the engine's sample rate.
    ///
    /// This recalculates timing constants and propagates the new rate to all voices.
    ///
    /// # Arguments
    ///
    /// * `sr` - The new sample rate in Hz.
    pub fn set_sample_rate(&mut self, sr: f32) {
        self.sample_rate = sr;
        for voice in self.voices.iter_mut() {
            voice.set_sample_rate(sr);
        }
        // Recalculate timing constant based on new sample rate
        self.samples_per_beat = (sr as f64 * 60.0) / self.tempo as f64;
    }

    /// Processes a single audio command event.
    ///
    /// # Arguments
    ///
    /// * `event` - The command structure containing operation code and parameters.
    pub fn handle_event(&mut self, event: AudioCommand) {
        match event.operation {
            OP_NOTE_ON => {
                if event.channel < MAX_CHANNELS as u32 {
                    self.trigger_voice(event.channel as usize, event.target, event.value)
                }
            }
            OP_NOTE_OFF => {
                if event.channel < MAX_CHANNELS as u32 {
                    self.release_voice(event.channel as usize, event.target)
                }
            }
            OP_PARAM => {
                if event.channel < MAX_CHANNELS as u32 {
                    self.channels[event.channel as usize].set_param(event.target, event.value);
                }
            }
            OP_METRONOME => {
                self.metronome.active = event.target != 0;
                self.metronome.volume = event.value;
            }
            OP_TRANSPORT => {
                // value = Tempo in BPM
                // target = Time Signature Numerator (default to 4 if 0 provided)
                self.tempo = event.value;
                self.time_signature_numerator = if event.target > 0 {
                    event.target as usize
                } else {
                    4
                };
                self.samples_per_beat = (self.sample_rate as f64 * 60.0) / self.tempo as f64;
            }
            OP_POSITION => {
                self.current_beat = event.value as f64;
            }
            OP_PLAY_STATE => {
                self.is_playing = event.target != 0;
            }
            OP_CONFIG => {
                // target 0 is reserved for setting Sample Rate
                if event.target == 0 {
                    self.set_sample_rate(event.value);
                }
            }
            _ => {}
        }
    }

    /// Triggers a new voice for the given note and channel.
    ///
    /// Uses a simple round-robin allocation strategy.
    ///
    /// # Arguments
    ///
    /// * `channel` - The channel index.
    /// * `note` - The MIDI note number.
    /// * `velocity` - The note velocity (0.0 - 1.0).
    fn trigger_voice(&mut self, channel: usize, note: u32, velocity: f32) {
        let voice = &mut self.voices[self.next_voice_idx];
        voice.note_on(channel, note, velocity);
        self.next_voice_idx = (self.next_voice_idx + 1) % MAX_VOICES;
    }

    /// Releases any active voices matching the channel and note.
    ///
    /// # Arguments
    ///
    /// * `channel` - The channel index.
    /// * `note` - The MIDI note number.
    fn release_voice(&mut self, channel: usize, note: u32) {
        for voice in self.voices.iter_mut() {
            if voice.is_active() && voice.channel_id == channel && voice.note == note {
                voice.note_off();
            }
        }
    }

    /// Generates the next block of audio samples.
    ///
    /// Iterates through the output buffer, mixing active voices and the metronome.
    ///
    /// # Arguments
    ///
    /// * `output` - Mutable slice to write stereo interleaved samples into.
    pub fn process_block(&mut self, output: &mut [f32]) {
        output.fill(0.0);

        let voices = &mut self.voices;
        let channels = &self.channels;

        // Iterate through the buffer in 2-sample steps (Stereo Frames)
        for frame in output.chunks_exact_mut(2) {
            // Advance Transport Time only if playing
            if self.is_playing {
                self.current_beat += 1.0 / self.samples_per_beat;

                // Check for Beat Boundary to trigger metronome clicks
                let beat_floor = self.current_beat.floor();
                let prev_beat = (self.current_beat - (1.0 / self.samples_per_beat)).floor();

                if beat_floor > prev_beat {
                    let beat_index = beat_floor as usize;
                    // Trigger accent on the first beat of the bar based on the time signature
                    let is_downbeat = beat_index % self.time_signature_numerator == 0;
                    self.metronome.trigger(is_downbeat);
                }
            }

            // Render Active Voices
            let mut left_mix = 0.0;
            let mut right_mix = 0.0;

            for voice in voices.iter_mut() {
                if voice.is_active() {
                    let channel = &channels[voice.channel_id];
                    let (l, r) = voice.process(channel);
                    left_mix += l;
                    right_mix += r;
                }
            }

            // Mix Metronome Output
            let click = self.metronome.process();
            left_mix += click;
            right_mix += click;

            // Write Interleaved Output
            frame[0] = left_mix;
            frame[1] = right_mix;
        }
    }
}
