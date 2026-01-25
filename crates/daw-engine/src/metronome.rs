use std::f32::consts::PI;

/// A synthesized metronome that generates a sine wave click with a linear decay envelope.
///
/// It provides an accented click (higher pitch) for the downbeat of a measure
/// and a standard click (lower pitch) for subsequent beats.
pub struct Metronome {
    /// Whether the metronome is currently enabled.
    pub active: bool,
    /// The output volume of the click (0.0 to 1.0).
    pub volume: f32,
    /// The sample rate of the audio context.
    sample_rate: f32,
    /// The current phase of the sine wave oscillator (0 to 2*PI).
    current_phase: f32,
    /// Counter for the remaining samples in the current click envelope.
    click_timer: usize,
    /// Whether a click is currently being synthesized.
    is_beeping: bool,
    /// Whether the current click is an accented downbeat (high pitch).
    high_pitch: bool,
}

impl Metronome {
    /// Creates a new Metronome instance.
    ///
    /// # Arguments
    ///
    /// * `sample_rate` - The audio sample rate in Hz.
    pub fn new(sample_rate: f32) -> Self {
        Self {
            active: false,
            volume: 0.5,
            sample_rate,
            current_phase: 0.0,
            click_timer: 0,
            is_beeping: false,
            high_pitch: false,
        }
    }

    /// Triggers a click event.
    ///
    /// # Arguments
    ///
    /// * `is_downbeat` - If true, triggers a high-pitched accent click.
    pub fn trigger(&mut self, is_downbeat: bool) {
        if !self.active {
            return;
        }
        self.is_beeping = true;
        self.high_pitch = is_downbeat;
        // 100ms click duration
        self.click_timer = (self.sample_rate * 0.1) as usize;
        self.current_phase = 0.0;
    }

    /// Generates the next audio sample for the metronome.
    ///
    /// # Returns
    ///
    /// A single f32 sample amplitude.
    pub fn process(&mut self) -> f32 {
        if !self.is_beeping || self.click_timer == 0 {
            return 0.0;
        }

        self.click_timer -= 1;
        if self.click_timer == 0 {
            self.is_beeping = false;
        }

        // High pitch: 1000Hz, Low pitch: 800Hz
        let freq = if self.high_pitch { 1000.0 } else { 800.0 };

        let phase_increment = 2.0 * PI * freq / self.sample_rate;
        self.current_phase += phase_increment;
        if self.current_phase > 2.0 * PI {
            self.current_phase -= 2.0 * PI;
        }

        // Apply linear decay envelope
        let envelope = self.click_timer as f32 / (self.sample_rate * 0.1);

        self.current_phase.sin() * envelope * self.volume
    }
}
