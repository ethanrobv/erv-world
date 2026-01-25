use crate::channel::Channel;

/// Represents the current stage of the amplitude envelope.
#[derive(Clone, Copy, PartialEq, Debug)]
enum EnvState {
    Idle,
    Attack,
    Decay,
    Sustain,
    Release,
}

/// A single polyphonic voice.
/// Handles pitch tracking, envelope generation, and per-voice DSP processing.
#[derive(Clone, Copy, Debug)]
pub struct Voice {
    /// The index of the mixer channel that owns this voice.
    pub channel_id: usize,
    /// The MIDI note number this voice is playing.
    pub note: u32,
    /// The velocity (gain) of the note event (0.0 to 1.0).
    pub velocity: f32,

    // DSP State
    phase: f32,
    phase_inc: f32,
    env_state: EnvState,
    env_level: f32,
    sample_rate: f32,
}

impl Voice {
    /// Creates a new voice instance.
    pub fn new(sample_rate: f32) -> Self {
        let sr = if sample_rate < 1.0 {
            44100.0
        } else {
            sample_rate
        };
        Voice {
            channel_id: 0,
            note: 0,
            velocity: 0.0,
            phase: 0.0,
            phase_inc: 0.0,
            env_state: EnvState::Idle,
            env_level: 0.0,
            sample_rate: sr,
        }
    }

    /// Updates the sample rate for correct pitch calculations.
    pub fn set_sample_rate(&mut self, sr: f32) {
        self.sample_rate = sr;
    }

    /// Triggers the start of a note.
    /// Resets the envelope to the Attack phase.
    pub fn note_on(&mut self, channel: usize, note: u32, velocity: f32) {
        self.channel_id = channel;
        self.note = note;
        self.velocity = velocity;

        // Calculate frequency: f = 440 * 2^((n - 69) / 12)
        let freq = 440.0 * 2.0_f32.powf((note as f32 - 69.0) / 12.0);
        self.phase_inc = freq / self.sample_rate;

        // Reset Envelope
        self.env_state = EnvState::Attack;
        self.env_level = 0.0;
    }

    /// Triggers the release phase of the note.
    pub fn note_off(&mut self) {
        if self.env_state != EnvState::Idle {
            self.env_state = EnvState::Release;
        }
    }

    /// Returns true if the voice is currently producing sound.
    pub fn is_active(&self) -> bool {
        self.env_state != EnvState::Idle
    }

    /// Generates one stereo sample frame (Left, Right).
    ///
    /// This function acts as the bridge between the synthesis logic (Instrument)
    /// and the mixing logic (Channel).
    pub fn process(&mut self, channel: &Channel) -> (f32, f32) {
        if self.env_state == EnvState::Idle {
            return (0.0, 0.0);
        }

        // 1. Fetch ADSR parameters from the active plugin
        // (Attack, Decay, Sustain, Release)
        let (attack, decay, sustain, release) = channel.instrument.get_adsr();

        // 2. Advance Envelope State Machine
        match self.env_state {
            EnvState::Attack => {
                // Linear ramp up to 1.0
                let rate = 1.0 / (attack * self.sample_rate);
                self.env_level += rate;
                if self.env_level >= 1.0 {
                    self.env_level = 1.0;
                    self.env_state = EnvState::Decay;
                }
            }
            EnvState::Decay => {
                // Linear ramp down to Sustain level
                let rate = 1.0 / (decay * self.sample_rate);
                self.env_level -= rate;
                if self.env_level <= sustain {
                    self.env_level = sustain;
                    self.env_state = EnvState::Sustain;
                }
            }
            EnvState::Sustain => {
                // Hold steady
                self.env_level = sustain;
            }
            EnvState::Release => {
                // Linear ramp down to 0.0
                let rate = 1.0 / (release * self.sample_rate);
                self.env_level -= rate;
                if self.env_level <= 0.0 {
                    self.env_level = 0.0;
                    self.env_state = EnvState::Idle;
                    return (0.0, 0.0);
                }
            }
            _ => {}
        }

        // 3. Generate Raw Audio from Plugin
        let raw_sample = channel.instrument.get_sample(self.phase);

        // Advance Oscillator Phase
        self.phase += self.phase_inc;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }

        // 4. Apply Gain (Velocity * Envelope * Channel Gain)
        let signal = raw_sample * self.env_level * self.velocity * channel.gain;

        // 5. Stereo Panning (Constant Power Law)
        // Pan maps -1.0 (Left) ... 1.0 (Right)
        let pan_norm = (channel.pan + 1.0) * 0.5; // Normalized 0.0 to 1.0

        // Square root panning
        let left_gain = (1.0 - pan_norm).sqrt();
        let right_gain = pan_norm.sqrt();

        (signal * left_gain, signal * right_gain)
    }
}
