/**
 * Represents a single musical note event within a clip.
 */
export interface Note {
    /** Unique identifier for the note. */
    id: string;
    /** The MIDI note number (0-127). */
    midi: number;
    /** The start time of the note in beats, relative to the start of the clip. */
    start: number;
    /** The duration of the note in beats. */
    duration: number;
    /** The velocity (gain) of the note, ranging from 0.0 to 1.0. */
    velocity: number;
}

/**
 * Represents a container for musical notes placed on the timeline.
 */
export interface Clip {
    /** Unique identifier for the clip. */
    id: string;
    /** The UUID of the track that contains this clip. */
    trackId: string;
    /** The start time of the clip in beats, relative to the project start. */
    start: number;
    /** The length of the clip in beats. */
    length: number;
    /** The collection of notes contained within this clip. */
    notes: Note[];
    /** The user-visible name of the clip. */
    name: string;
}

/**
 * Defines the available types of instrument plugins in the system.
 */
export type PluginType = string;

/**
 * Represents the state of an instrument plugin loaded on a track.
 * This structure allows for different instrument types with dynamic parameter sets.
 */
export interface PluginState {
    /** The specific type identifier for the plugin (e.g., 'default-synth'). */
    type: PluginType;
    /** The user-visible name of the plugin instance. */
    name: string;
    /**
     * A map of parameter IDs to their current values.
     * Keys correspond to the WASM engine's parameter indices (e.g., 10 for Attack).
     */
    params: Record<number, number>;
}

/**
 * Represents a single horizontal lane in the arrangement.
 * It maps directly to a specific mixer channel in the Rust Audio Engine.
 */
export interface Track {
    /** Unique identifier for the track. */
    id: string;
    /** The index 0-15 of the channel in the Rust Engine this track controls. */
    channelIndex: number;
    /** The user-visible name of the track. */
    name: string;
    /** The display color of the track in hex format. */
    color: string;
    /** Whether the track output is currently silenced. */
    isMuted: boolean;
    /** Whether the track is in solo mode, silencing non-soloed tracks. */
    isSoloed: boolean;

    /**
     * The volume gain multiplier for the track mixer (0.0 to ~1.5).
     * This is applied *after* the instrument plugin's output.
     */
    volume: number;

    /**
     * Stereo Panning (-1.0 Left to 1.0 Right).
     * This is applied *after* the instrument plugin's output.
     */
    pan: number;

    /**
     * The instrument plugin configuration for this track.
     * Contains the synthesis parameters and state.
     */
    instrument: PluginState;
}

/**
 * Defines the time signature of the project (e.g., 4/4).
 */
export interface TimeSignature {
    /** The number of beats per measure. */
    numerator: number;
    /** The note value that represents one beat (e.g., 4 for a quarter note). */
    denominator: number;
}

/**
 * Defines the musical key and scale of the project for theory utilities.
 */
export interface KeySignature {
    /** The root note of the key (e.g., 'C', 'F#'). */
    root: string;
    /** The scale type. */
    scale: 'Major' | 'Minor';
}

/**
 * Configuration for the built-in metronome.
 */
export interface MetronomeState {
    /** Whether the metronome click is currently audible. */
    isActive: boolean;
    /** The output volume of the click track (0.0 to 1.0). */
    volume: number;
}

/**
 * Represents the state of the playback transport system.
 */
export interface TransportState {
    /** Whether the audio engine is currently playing. */
    isPlaying: boolean;
    /** Whether the transport is currently recording input. */
    isRecording: boolean;
    /** The playback speed in Beats Per Minute. */
    tempo: number;
    /** The current playhead position in beats. */
    position: number;
    /** The AudioContext hardware time when the last playback started. */
    startTime: number;
    /** The project's time signature configuration. */
    timeSignature: TimeSignature;
    /** The project's musical key configuration. */
    keySignature: KeySignature;
    /** The metronome configuration settings. */
    metronome: MetronomeState;
}

/**
 * Represents the configuration of the arrangement view and editing behavior.
 */
export interface ViewState {
    /** The horizontal zoom level of the timeline (pixels per beat). */
    zoomLevel: number;
    /** Whether clip operations should snap to the defined grid. */
    snapToGrid: boolean;
    /** The grid resolution in beats (e.g., 0.25 for 16th notes). */
    gridSize: number;
}

/**
 * Polymorphic clipboard data types.
 */
export type ClipboardData = { type: 'clip'; data: Clip } | { type: 'notes'; data: Note[] };

/**
 * Represents the global state of the DAW project.
 */
export interface ProjectState {
    /** Unique identifier for the project. */
    id: string;
    /** The user-visible name of the project. */
    name: string;
    /** The state of the playback transport system. */
    transport: TransportState;
    /** The configuration state for the arrangement view. */
    view: ViewState;
    /** The list of audio tracks in the project. */
    tracks: Track[];
    /** A normalized record of all clips in the project, keyed by ID. */
    clips: Record<string, Clip>;

    /** The ID of the currently selected track in the UI, or null if none. */
    selectedTrackId: string | null;
    /** The ID of the currently selected clip in the UI, or null if none. */
    selectedClipId: string | null;
    /** The global clipboard buffer. */
    clipboard: ClipboardData | null;
}
