use crate::event::{PARAM_GAIN, PARAM_PAN};
use crate::instrument::{DefaultSynth, InstrumentType};

/// Represents the state of a single audio channel (Track).
/// Holds the active instrument plugin and mixer settings (Gain/Pan).
#[derive(Clone, Copy, Debug)]
pub struct Channel {
    /// The instrument plugin instance active on this channel.
    pub instrument: InstrumentType,

    /// Channel Volume Gain multiplier (0.0 to 2.0).
    pub gain: f32,

    /// Stereo Panning position (-1.0 Left to 1.0 Right).
    pub pan: f32,
}

impl Channel {
    /// Creates a new Channel with default settings.
    /// Initializes with the `DefaultSynth` plugin loaded.
    pub fn new() -> Self {
        Channel {
            instrument: InstrumentType::DefaultSynth(DefaultSynth::new()),
            gain: 0.8,
            pan: 0.0,
        }
    }

    /// Routes a parameter change event to the appropriate destination.
    ///
    /// Mixer parameters (Gain, Pan) are handled immediately.
    /// All other parameters are forwarded to the loaded instrument plugin.
    ///
    /// # Arguments
    /// * `param_id` - The unique identifier of the parameter to change.
    /// * `value` - The new floating-point value.
    pub fn set_param(&mut self, param_id: u32, value: f32) {
        match param_id {
            // Mixer Parameters
            PARAM_GAIN => self.gain = value.max(0.0).min(2.0),
            PARAM_PAN => self.pan = value.max(-1.0).min(1.0),

            // Delegate all other parameters to the Instrument
            _ => self.instrument.set_param(param_id, value),
        }
    }
}
