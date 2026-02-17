import { createSignal } from 'solid-js';
import { ProjectActions } from '../../store/project';
import { detectChord } from '../logic/music-theory';

/**
 * Represents a physical or virtual MIDI input/output device.
 */
export interface MidiDevice {
    /** The unique identifier of the device. */
    id: string;
    /** The display name of the device. */
    name: string;
    /** The manufacturer of the device, if available. */
    manufacturer: string;
    /** The connection state (e.g., 'connected', 'disconnected'). */
    state: string;
    /** The type of port ('input' or 'output'). */
    type: 'input' | 'output';
    /** The connection status (e.g., 'open', 'closed'). */
    connection: string;
}

/**
 * Mapping of QWERTY keyboard keys to their semitone offsets relative to the base octave.
 * Layout mimics a piano keyboard (Z=C, S=C#, X=D, etc.).
 */
export const KEY_OFFSETS: Record<string, number> = {
    z: 0,
    s: 1,
    x: 2,
    d: 3,
    c: 4,
    v: 5,
    g: 6,
    b: 7,
    h: 8,
    n: 9,
    j: 10,
    m: 11,
    ',': 12,
    l: 13,
    '.': 14,
    ';': 15,
    '/': 16,
    q: 12,
    '2': 13,
    w: 14,
    '3': 15,
    e: 16,
    r: 17,
    '5': 18,
    t: 19,
    '6': 20,
    y: 21,
    '7': 22,
    u: 23,
    i: 24,
    '9': 25,
    o: 26,
    '0': 27,
    p: 28,
};

/**
 * The default octave index for the virtual keyboard anchor (Z key).
 * 4 corresponds to Middle C (MIDI 60) if offset is 0.
 */
export const BASE_OCTAVE = 4;

// Global Signals

/** Signal containing a set of currently active (pressed) MIDI note numbers. */
export const [activeInputNotes, setActiveInputNotes] = createSignal<Set<number>>(new Set());

/** Signal indicating whether the computer keyboard should act as a MIDI controller. */
export const [isQwertyEnabled, setIsQwertyEnabled] = createSignal(false);

/** Signal representing the velocity (0.0 - 1.0) for computer keyboard notes. */
export const [inputVelocity, setInputVelocity] = createSignal(0.8);

/** Signal representing the current octave shift for the computer keyboard. */
export const [inputOctave, setInputOctave] = createSignal(0);

/** Signal containing the list of connected MIDI devices. */
export const [connectedMidiDevices, setConnectedMidiDevices] = createSignal<MidiDevice[]>([]);

/** Signal containing the name of the chord detected from currently active notes. */
export const [currentChord, setCurrentChord] = createSignal('');

/**
 * Calculates the MIDI note number corresponding to the first key (Z) based on current octave settings.
 * @returns The MIDI note number.
 */
export const keyboardBaseMidi = () => {
    return (BASE_OCTAVE + inputOctave()) * 12;
};

/**
 * Manages MIDI input from both hardware devices and the computer keyboard.
 * Handles device discovery, event listeners, and routing to ProjectActions.
 */
export class InputManager {
    private midiAccess: MIDIAccess | null = null;
    private _activeNotes = new Set<number>();

    private readonly boundKeyDown = this.handleKeyDown.bind(this);
    private readonly boundKeyUp = this.handleKeyUp.bind(this);
    private readonly boundMidiHandler = this.handleMidiMessage.bind(this);
    private readonly boundStateChange = this.handleStateChange.bind(this);

    /**
     * A lookup table mapping semitone offsets to their QWERTY key labels.
     * Used for UI visualization of the virtual keyboard.
     */
    public static NoteToKeyLabel: Record<number, string> = {};

    static {
        for (const [key, offset] of Object.entries(KEY_OFFSETS)) {
            const isAlpha = /^[a-zA-Z]$/.test(key);
            const currentLabel = InputManager.NoteToKeyLabel[offset];
            // Prioritize alphabetical labels over symbols if duplicates exist
            if (!currentLabel || (isAlpha && !/^[a-zA-Z]$/.test(currentLabel))) {
                InputManager.NoteToKeyLabel[offset] = key.toUpperCase();
            }
        }
    }

    constructor() {
        if (import.meta.hot) {
            import.meta.hot.dispose(() => this.dispose());
        }
    }

    /**
     * Initializes the InputManager, binding keyboard events and requesting Web MIDI access.
     */
    async init() {
        this.dispose();
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        if (!navigator.requestMIDIAccess) {
            console.warn('[InputManager] Web MIDI API not supported.');
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
        } catch (err) {
            try {
                // Fallback to non-sysex access
                this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            } catch (retryErr) {
                console.error('[InputManager] MIDI Access Denied:', retryErr);
                return;
            }
        }

        if (this.midiAccess) {
            this.midiAccess.onstatechange = this.boundStateChange;
            this.updateDevices();
        }
    }

    /**
     * Cleans up event listeners and MIDI connections.
     */
    dispose() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        setActiveInputNotes(new Set<number>());
        setCurrentChord('');

        if (this.midiAccess) {
            this.midiAccess.onstatechange = null;
            this.midiAccess.inputs.forEach((input) => {
                input.onmidimessage = null;
            });
            this.midiAccess = null;
        }
    }

    /**
     * Scans for connected MIDI devices and updates the `connectedMidiDevices` signal.
     * Re-binds message handlers to connected inputs.
     */
    public updateDevices() {
        if (!this.midiAccess) return;
        const devices: MidiDevice[] = [];
        this.midiAccess.inputs.forEach((input) => {
            devices.push({
                id: input.id,
                name: input.name || `Device ${input.id}`,
                manufacturer: input.manufacturer || 'Generic',
                state: input.state,
                type: 'input',
                connection: input.connection,
            });
            if (input.connection === 'open' || input.state === 'connected') {
                input.onmidimessage = this.boundMidiHandler;
            }
        });
        setConnectedMidiDevices(devices);
    }

    private handleStateChange(e: MIDIConnectionEvent) {
        if (e.port && e.port.type === 'input') {
            this.updateDevices();
        }
    }

    private addActiveNote(midi: number) {
        if (!this._activeNotes.has(midi)) {
            this._activeNotes.add(midi);
            setActiveInputNotes(new Set(this._activeNotes));
            setCurrentChord(detectChord(this._activeNotes));
        }
    }

    private removeActiveNote(midi: number) {
        if (this._activeNotes.has(midi)) {
            this._activeNotes.delete(midi);
            setActiveInputNotes(new Set(this._activeNotes));
            setCurrentChord(detectChord(this._activeNotes));
        }
    }

    private getMidiFromKey(key: string): number | null {
        const offset = KEY_OFFSETS[key.toLowerCase()];
        if (offset === undefined) return null;
        return keyboardBaseMidi() + offset;
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (e.repeat || !isQwertyEnabled()) return;

        const note = this.getMidiFromKey(e.key);
        if (note !== null) {
            this.addActiveNote(note);
            ProjectActions.handleMidiEvent(note, inputVelocity(), 'noteOn');
        }
    }

    private handleKeyUp(e: KeyboardEvent) {
        if (!isQwertyEnabled()) return;
        const note = this.getMidiFromKey(e.key);
        if (note !== null) {
            this.removeActiveNote(note);
            ProjectActions.handleMidiEvent(note, 0, 'noteOff');
        }
    }

    private handleMidiMessage(e: MIDIMessageEvent) {
        if (!e.data) return;
        const [status, data1, data2] = e.data;
        const command = status & 0xf0;

        // Ignore System Common messages
        if (command >= 0xf0) return;

        // Note On
        if (command === 144 && data2 > 0) {
            this.addActiveNote(data1);
            ProjectActions.handleMidiEvent(data1, data2 / 127.0, 'noteOn');
        }
        // Note Off (or Note On with 0 velocity)
        else if (command === 128 || (command === 144 && data2 === 0)) {
            this.removeActiveNote(data1);
            ProjectActions.handleMidiEvent(data1, 0, 'noteOff');
        }
    }
}

export const inputManager = new InputManager();
