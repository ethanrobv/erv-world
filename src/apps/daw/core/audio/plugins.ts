/**
 * Defines the available control types for the generated UI.
 */
export type ControlType = 'knob' | 'fader' | 'waveform';

/**
 * Describes a single UI parameter control.
 */
export interface ControlDef {
    type: ControlType;
    label: string;
    paramId: number;
    /** For knobs and faders */
    min?: number;
    max?: number;
    /** For waveform selectors */
    options?: { label: string; value: number; icon?: 'Saw' | 'Pulse' | 'Sine' }[];
    /** Optional color override for the control */
    color?: string;
}

/**
 * Represents a visual grouping of controls (e.g., "Oscillator", "Filter").
 */
export interface PluginSection {
    id: string;
    title: string;
    controls: ControlDef[];
}

/**
 * Interface representing the static definition of an Instrument Plugin.
 * Used to populate the UI and initialize new tracks with correct defaults.
 */
export interface PluginDefinition {
    /** Unique string identifier for the plugin. */
    id: string;
    /** Human-readable display name for the plugin. */
    name: string;
    /**
     * Default parameter values indexed by their internal ID.
     */
    defaults: Record<number, number>;
    /**
     * The dynamic UI definition.
     * Allows plugins to define their own visual layout.
     */
    ui: PluginSection[];
}

/**
 * A registry of all available instrument plugins.
 * Keys are the plugin IDs.
 */
export const PLUGIN_REGISTRY: Record<string, PluginDefinition> = {
    'default-synth': {
        id: 'default-synth',
        name: 'Default Synth',
        defaults: {
            // ADSR Envelope
            10: 0.01,
            11: 0.1,
            12: 0.8,
            13: 0.3,
            // Oscillator
            14: 0,
            // Pan and Volume: Track params managed by plugin UI
            98: 0.0,
            99: 0.5,
        },
        ui: [
            {
                id: 'output',
                title: 'Main Out',
                controls: [
                    { type: 'knob', label: 'Volume', paramId: 99, min: 0.0, max: 1.5, color: '#10b981' },
                    { type: 'knob', label: 'Pan', paramId: 98, min: -1.0, max: 1.0 },
                ],
            },
            {
                id: 'envelope',
                title: 'Envelope',
                controls: [
                    { type: 'knob', label: 'Attack', paramId: 10, min: 0.001, max: 1.0 },
                    { type: 'knob', label: 'Decay', paramId: 11, min: 0.01, max: 1.0 },
                    { type: 'knob', label: 'Sustain', paramId: 12, min: 0.0, max: 1.0 },
                    { type: 'knob', label: 'Release', paramId: 13, min: 0.01, max: 3.0 },
                ],
            },
            {
                id: 'oscillator',
                title: 'Oscillator',
                controls: [
                    {
                        type: 'waveform',
                        label: 'Shape',
                        paramId: 14,
                        options: [
                            { label: 'Saw', value: 0, icon: 'Saw' },
                            { label: 'Pulse', value: 1, icon: 'Pulse' },
                            { label: 'Sine', value: 2, icon: 'Sine' },
                        ],
                    },
                ],
            },
        ],
    },
};

/**
 * Retrieves the default parameter set for a specific plugin type.
 * Returns a deep copy to prevent mutation of the registry.
 */
export const getPluginDefaults = (type: string): Record<number, number> => {
    const def = PLUGIN_REGISTRY[type];
    if (!def) {
        console.warn(`[PluginRegistry] Unknown plugin type: ${type}`);
        return {};
    }
    return { ...def.defaults };
};
