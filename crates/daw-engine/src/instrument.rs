use crate::event::{PARAM_ATTACK, PARAM_DECAY, PARAM_RELEASE, PARAM_SUSTAIN, PARAM_WAVEFORM};

/// Represents the different types of instrument plugins available in the engine.
///
/// This enum facilitates static dispatch for instrument processing. Unlike using
/// a Trait Object (e.g., `Box<dyn Instrument>`), which requires a vtable lookup
/// for every function call, this Enum allows the compiler to inline the specific
/// instrument logic directly into the audio processing loop. This significantly
/// reduces CPU overhead in WebAssembly.
#[derive(Clone, Copy, Debug)]
pub enum InstrumentType {
    /// The built-in subtractive synthesizer.
    DefaultSynth(DefaultSynth),
}

impl InstrumentType {
    /// Updates a parameter on the active instrument.
    ///
    /// This method routes the parameter change event to the specific instrument implementation
    /// contained within the enum variant.
    ///
    /// # Arguments
    /// * `id` - The unique parameter identifier (defined in `event.rs`).
    /// * `value` - The new floating-point value to apply.
    #[inline(always)]
    pub fn set_param(&mut self, id: u32, value: f32) {
        match self {
            InstrumentType::DefaultSynth(synth) => synth.set_param(id, value),
        }
    }

    /// Generates the next audio sample from the active instrument's oscillator.
    ///
    /// This is the "hot" method called for every sample frame. It is forced inline to minimize
    /// call overhead.
    ///
    /// # Arguments
    /// * `phase` - The current normalized phase of the oscillator (0.0 to 1.0).
    ///
    /// # Returns
    /// A floating-point sample value between -1.0 and 1.0.
    #[inline(always)]
    pub fn get_sample(&self, phase: f32) -> f32 {
        match self {
            InstrumentType::DefaultSynth(synth) => synth.get_sample(phase),
        }
    }

    /// Retrieves the Amplitude Envelope (ADSR) parameters for the active instrument.
    ///
    /// The Voice logic requires these values to calculate the envelope level for
    /// the current frame.
    ///
    /// # Returns
    /// A tuple containing:
    /// * `attack`: Time in seconds to reach peak level.
    /// * `decay`: Time in seconds to drop to sustain level.
    /// * `sustain`: The sustain level (0.0 to 1.0).
    /// * `release`: Time in seconds to fade out after note off.
    #[inline(always)]
    pub fn get_adsr(&self) -> (f32, f32, f32, f32) {
        match self {
            InstrumentType::DefaultSynth(synth) => {
                (synth.attack, synth.decay, synth.sustain, synth.release)
            }
        }
    }
}

/// A classic Subtractive Synthesizer implementation.
///
/// This struct holds the state and parameters for a basic synthesizer voice.
/// It features a multi-waveform oscillator (Sawtooth, Pulse, Sine) and standard
/// ADSR (Attack, Decay, Sustain, Release) envelope parameters.
#[derive(Clone, Copy, Debug)]
pub struct DefaultSynth {
    /// Attack time in seconds. Determines how quickly the sound reaches full volume.
    pub attack: f32,
    /// Decay time in seconds. Determines how quickly the sound drops to the sustain level.
    pub decay: f32,
    /// Sustain level (0.0 to 1.0). The constant volume level held while the key is pressed.
    pub sustain: f32,
    /// Release time in seconds. How long the sound takes to fade to silence after the key is released.
    pub release: f32,
    /// The selected waveform ID (0=Saw, 1=Pulse, 2=Sine).
    pub waveform: u32,
}

impl DefaultSynth {
    /// Creates a new `DefaultSynth` instance with musically useful default values.
    ///
    /// These defaults are chosen to ensure the synth produces an audible and clear
    /// sound immediately upon instantiation, preventing "silent start" issues.
    pub fn new() -> Self {
        Self {
            attack: 0.01, // Fast attack for a responsive feel
            decay: 0.1,   // Short decay to emphasize the transient
            sustain: 0.8, // High sustain for clear audibility
            release: 0.3, // moderate release for a natural fade
            waveform: 0,  // Sawtooth wave (rich in harmonics, cuts through mix)
        }
    }

    /// Updates a specific parameter of the synthesizer based on the parameter ID.
    ///
    /// Input values are clamped to safe ranges to ensure DSP stability and prevent
    /// invalid state (e.g., negative time values).
    ///
    /// # Arguments
    /// * `id` - The parameter ID to update.
    /// * `value` - The new value from the host.
    #[inline(always)]
    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            PARAM_ATTACK => self.attack = value.max(0.001),
            PARAM_DECAY => self.decay = value.max(0.01),
            PARAM_SUSTAIN => self.sustain = value.max(0.0).min(1.0),
            PARAM_RELEASE => self.release = value.max(0.01),
            PARAM_WAVEFORM => self.waveform = value as u32,
            _ => {}
        }
    }

    /// Generates a raw oscillator sample for a given phase.
    ///
    /// This method implements the mathematical functions for the supported waveforms.
    /// It is marked `#[inline(always)]` to ensure it compiles down to direct arithmetic
    /// instructions in the main loop.
    ///
    /// # Arguments
    /// * `phase` - The normalized phase accumulator (0.0 to 1.0).
    ///
    /// # Returns
    /// The computed sample amplitude (-1.0 to 1.0).
    #[inline(always)]
    pub fn get_sample(&self, phase: f32) -> f32 {
        match self.waveform {
            // Sawtooth: Linearly ramps from -1.0 to 1.0.
            // Formula: (phase * 2) - 1
            // Rich in both even and odd harmonics.
            0 => (phase * 2.0) - 1.0,

            // Pulse / Square: Switches between 1.0 and -1.0 based on phase.
            // Currently fixed at 50% duty cycle (Square wave).
            // Rich in odd harmonics only; has a "hollow" sound.
            1 => {
                if phase < 0.5 {
                    1.0
                } else {
                    -1.0
                }
            }

            // Sine: Pure fundamental frequency.
            _ => (phase * 2.0 * std::f32::consts::PI).sin(),
        }
    }
}
