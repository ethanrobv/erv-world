/// Operation Code: Stop a note (Note Off).
/// Routes to the voice allocator to trigger the release phase.
pub const OP_NOTE_OFF: u32 = 0;

/// Operation Code: Start a note (Note On).
/// Routes to the voice allocator to find a free voice and trigger the attack phase.
pub const OP_NOTE_ON: u32 = 1;

/// Operation Code: Change a parameter value.
/// Updates synthesis parameters (like ADSR) or mixer settings (Gain/Pan).
pub const OP_PARAM: u32 = 2;

/// Operation Code: Configure Metronome.
/// target: 1 = Active, 0 = Inactive.
/// value: Volume (0.0 to 1.0).
pub const OP_METRONOME: u32 = 3;

/// Operation Code: Update Transport.
/// target: Time Signature Numerator (e.g., 4 for 4/4, 3 for 3/4).
/// value: Tempo in BPM.
pub const OP_TRANSPORT: u32 = 4;

/// Operation Code: Set Transport Position (Seek).
/// value: The new playhead position in beats.
pub const OP_POSITION: u32 = 5;

/// Operation Code: Set Playback State.
/// target: 1 = Playing, 0 = Stopped/Paused.
pub const OP_PLAY_STATE: u32 = 6;

/// Operation Code: System Configuration.
/// target: 0 = Set Sample Rate.
/// value: Sample Rate in Hz.
pub const OP_CONFIG: u32 = 7;

// Plugin Parameters (10 to 50)
// These constants must strictly match the definitions in the frontend (plugins.ts).

/// Amplitude Envelope Attack Time in seconds.
pub const PARAM_ATTACK: u32 = 10;
/// Amplitude Envelope Decay Time in seconds.
pub const PARAM_DECAY: u32 = 11;
/// Amplitude Envelope Sustain Level (0.0 to 1.0).
pub const PARAM_SUSTAIN: u32 = 12;
/// Amplitude Envelope Release Time in seconds.
pub const PARAM_RELEASE: u32 = 13;
/// Oscillator Waveform Selection (0=Saw, 1=Pulse, 2=Sine).
pub const PARAM_WAVEFORM: u32 = 14;

// Mixer Parameters (90 and above)
// These are processed by the Channel logic, not the Instrument voice.

/// Channel Stereo Panning.
/// Range: -1.0 (Hard Left) to 1.0 (Hard Right).
pub const PARAM_PAN: u32 = 98;
/// Channel Output Gain / Volume Multiplier.
/// Linear scale (0.0 is silent, 1.0 is unity gain).
pub const PARAM_GAIN: u32 = 99;

/// A specialized command structure for the lock free ring buffer (SPSC).
/// This structure is shared between the Host (JavaScript) and the Engine (WASM).
///
/// # Memory Layout
/// It is marked `#[repr(C)]` and aligned to 16 bytes.
/// This alignment is critical for:
/// 1. Preventing false sharing across cache lines.
/// 2. Allowing potential SIMD optimizations in future processing.
/// 3. Ensuring consistent memory mapping between the JS TypedArray and WASM memory.
#[repr(C, align(16))]
#[derive(Clone, Copy, Debug)]
pub struct AudioCommand {
    /// The operation type (e.g., OP_NOTE_ON, OP_METRONOME, OP_CONFIG).
    pub operation: u32,
    /// The target identifier.
    /// For Notes: The MIDI Note Number (0-127).
    /// For Params: The Parameter ID (e.g., PARAM_ATTACK).
    /// For Metronome: 1=Active, 0=Inactive.
    /// For Play State: 1=Playing, 0=Stopped.
    /// For Transport: Time Signature Numerator (e.g. 4).
    /// For Config: 0=SampleRate.
    pub target: u32,
    /// The value associated with the operation.
    /// For Notes: Velocity (0.0 to 1.0).
    /// For Params: The new parameter value.
    /// For Transport: Tempo (BPM).
    /// For Position: Beat number (float).
    /// For Metronome: Volume (0.0 to 1.0).
    /// For Config: The configuration value (e.g., 48000.0).
    pub value: f32,
    /// The target audio channel index (0-15).
    pub channel: u32,
}

impl Default for AudioCommand {
    /// Provides a safe "no-op" state for the command struct.
    fn default() -> Self {
        Self {
            operation: OP_NOTE_OFF,
            target: 0,
            value: 0.0,
            channel: 0,
        }
    }
}
