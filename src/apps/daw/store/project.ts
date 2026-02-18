import { createStore, produce } from 'solid-js/store';
import { audioEngine } from '../core/audio/audio-context';
import { audioScheduler } from '../core/audio/scheduler';
import { WindowActions } from './window-manager';
import { getPluginDefaults, PLUGIN_REGISTRY } from '../core/audio/plugins';
import type { Clip, ClipboardData, Note, ProjectState, Track } from './types';
import { history } from '../core/logic/history';

/**
 * The initial state configuration for a new project.
 */
const defaultState: ProjectState = {
    id: 'project_default',
    name: 'Untitled Project',
    transport: {
        isPlaying: false,
        isRecording: false,
        tempo: 120,
        position: 0,
        startTime: 0,
        timeSignature: { numerator: 4, denominator: 4 },
        keySignature: { root: 'C', scale: 'Major' },
        metronome: {
            isActive: false,
            volume: 0.5,
        },
    },
    view: {
        zoomLevel: 1.0,
        snapToGrid: true,
        gridSize: 0.25,
    },
    tracks: [],
    clips: {},
    selectedTrackId: null,
    selectedClipId: null,
    clipboard: null,
};

// Internal state for tracking active recording notes map(midi_note -> {start_time, clip_id})
const activeRecordingNotes = new Map<number, { start: number; clipId: string }>();

/**
 * The global project store. Contains all state related to tracks, clips, and transport.
 */
export const [project, setProject] = createStore<ProjectState>(defaultState);

/**
 * Helper to calculate the duration of one measure in beats.
 * Formula: (Numerator * 4) / Denominator.
 * @returns The length of a measure in beats.
 */
const getMeasureLength = () => {
    const { numerator, denominator } = project.transport.timeSignature;
    return (numerator * 4) / denominator;
};

/**
 * Low-level mutators that directly modify the store.
 * These are used by the History system to replay actions (Undo/Redo)
 * without triggering duplicate history entries.
 */
const Mutators = {
    addTrack: (track: Track) => {
        setProject('tracks', (t) => [...t, track]);
        // Restore plugin state in audio engine
        Object.entries(track.instrument.params).forEach(([paramId, value]) => {
            audioEngine.sendParam(track.channelIndex, Number(paramId), value);
        });
    },
    removeTrack: (trackId: string) => {
        setProject('tracks', (t) => t.filter((tr) => tr.id !== trackId));
    },
    addClip: (clip: Clip) => {
        setProject('clips', clip.id, clip);
    },
    removeClip: (clipId: string) => {
        setProject(
            'clips',
            produce((clips) => {
                delete clips[clipId];
            })
        );
    },
    setTempo: (tempo: number) => {
        setProject('transport', 'tempo', tempo);
        // Ensure engine receives both tempo and time signature for metronome logic
        audioEngine.setTransport(tempo, project.transport.timeSignature.numerator);
    },
    setTimeSignature: (numerator: number, denominator: number) => {
        setProject('transport', 'timeSignature', { numerator, denominator });
        // Sync new signature to engine
        audioEngine.setTransport(project.transport.tempo, numerator);
    },
    setStartTime: (time: number) => {
        setProject('transport', 'startTime', time);
    },
};

/**
 * Collection of actions to modify the project state.
 * These actions wrap mutations with History tracking and side effect logic.
 */
export const ProjectActions = {
    /**
     * Adds a new track with the specified instrument plugin.
     * Automatically assigns the first available channel index (0-15).
     *
     * @param pluginId - The ID of the plugin to load (defaults to 'default-synth').
     * @returns The ID of the newly created track, or undefined if max channels reached.
     */
    addTrack: (pluginId: string = 'default-synth') => {
        const usedChannels = new Set(project.tracks.map((t) => t.channelIndex));
        let channelIndex = 0;
        while (usedChannels.has(channelIndex) && channelIndex < 16) channelIndex++;

        if (channelIndex >= 16) return;

        const pluginDef = PLUGIN_REGISTRY[pluginId];
        if (!pluginDef) {
            console.error(`Cannot add track: Plugin '${pluginId}' not found.`);
            return;
        }

        const id = crypto.randomUUID();
        const defaultParams = getPluginDefaults(pluginId);
        const defaultPan = defaultParams[98] ?? 0.0;
        const defaultVolume = defaultParams[99] ?? 0.8;

        const newTrack: Track = {
            id,
            channelIndex,
            name: `${pluginDef.name} ${channelIndex + 1}`,
            color: '#3b82f6',
            isMuted: false,
            isSoloed: false,
            volume: defaultVolume,
            pan: defaultPan,
            instrument: {
                type: pluginId,
                name: pluginDef.name,
                params: defaultParams,
            },
        };

        Mutators.addTrack(newTrack);

        history.push({
            name: `Add Track ${newTrack.name}`,
            undo: () => {
                Mutators.removeTrack(newTrack.id);
                if (project.selectedTrackId === newTrack.id) {
                    setProject('selectedTrackId', null);
                }
            },
            redo: () => Mutators.addTrack(newTrack),
        });

        setProject('selectedTrackId', id);
        setProject('selectedClipId', null);
        WindowActions.open('deviceRack');
        WindowActions.focus('deviceRack');

        return id;
    },

    /**
     * Updates a specific parameter of an instrument plugin on a track.
     */
    updatePluginParam: (trackId: string, paramId: number, value: number) => {
        setProject('tracks', (t) => t.id === trackId, 'instrument', 'params', paramId, value);
    },

    /**
     * Updates a generic property of a track (e.g., volume, pan, name).
     */
    updateTrackParam: (trackId: string, param: keyof Track, value: any) => {
        setProject('tracks', (t) => t.id === trackId, param, value);
    },

    /**
     * Creates a new clip on the specified track.
     * Prevents creation if the new clip would overlap with an existing one.
     */
    addClip: (trackId: string, startBeat: number, length?: number) => {
        const defaultLength = length ?? getMeasureLength();

        const collision = Object.values(project.clips).some(
            (c) =>
                c.trackId === trackId &&
                ((startBeat >= c.start && startBeat < c.start + c.length) ||
                    (startBeat + defaultLength > c.start && startBeat + defaultLength <= c.start + c.length))
        );

        if (collision) return;

        const id = crypto.randomUUID();
        const newClip: Clip = {
            id,
            trackId,
            start: startBeat,
            length: defaultLength,
            name: 'New Clip',
            notes: [],
        };

        Mutators.addClip(newClip);

        history.push({
            name: 'Add Clip',
            undo: () => Mutators.removeClip(id),
            redo: () => Mutators.addClip(newClip),
        });

        setProject('selectedClipId', id);
        return id;
    },

    /**
     * Deletes multiple clips by their IDs.
     * Includes History support for undoing the deletion.
     */
    deleteClips: (clipIds: string[]) => {
        const clipsToDelete = clipIds.map((id) => project.clips[id]).filter(Boolean);
        if (clipsToDelete.length === 0) return;

        clipIds.forEach((id) => Mutators.removeClip(id));

        if (project.selectedClipId && clipIds.includes(project.selectedClipId)) {
            setProject('selectedClipId', null);
        }

        history.push({
            name: `Delete ${clipsToDelete.length} Clip(s)`,
            undo: () => clipsToDelete.forEach((clip) => Mutators.addClip(clip)),
            redo: () => clipsToDelete.forEach((clip) => Mutators.removeClip(clip.id)),
        });
    },

    /**
     * Copies data to the global clipboard.
     */
    copy: (data: ClipboardData) => {
        setProject('clipboard', data);
    },

    /**
     * Pastes the current clipboard content as a new clip.
     */
    pasteClip: (startBeat: number, targetTrackId?: string | null) => {
        if (!project.clipboard || project.clipboard.type !== 'clip') return;

        const trackId = targetTrackId || project.selectedTrackId || project.clipboard.data.trackId;
        if (!project.tracks.some((t) => t.id === trackId)) return;

        const id = crypto.randomUUID();
        const newClip: Clip = {
            ...project.clipboard.data,
            id,
            trackId,
            start: startBeat,
        };

        Mutators.addClip(newClip);

        history.push({
            name: 'Paste Clip',
            undo: () => Mutators.removeClip(id),
            redo: () => Mutators.addClip(newClip),
        });

        ProjectActions.selectClip(id);
    },

    /**
     * Pastes notes from the clipboard into the specified clip.
     */
    pasteNotes: (targetClipId: string, currentBeat: number) => {
        if (!project.clipboard || project.clipboard.type !== 'notes') return;
        const notes = project.clipboard.data;
        if (notes.length === 0) return;

        const earliestStart = Math.min(...notes.map((n) => n.start));
        const offset = currentBeat - earliestStart;
        const gridSize = project.view.snapToGrid ? project.view.gridSize : 0;
        const alignOffset = gridSize > 0 ? Math.round(offset / gridSize) * gridSize : offset;

        const newNotes: Note[] = notes.map((n) => ({
            ...n,
            id: crypto.randomUUID(),
            start: Math.max(0, n.start + alignOffset),
        }));

        setProject('clips', targetClipId, 'notes', (prev) => [...prev, ...newNotes]);
    },

    /**
     * Updates a property of a clip.
     */
    updateClipParam: (clipId: string, param: keyof Clip, value: any) => {
        setProject('clips', clipId, param, value);
    },

    /**
     * Adds a single note to a specific clip.
     */
    addNote: (clipId: string, midi: number, start: number, duration: number, velocity: number = 0.8) => {
        const newNote: Note = { id: crypto.randomUUID(), midi, start, duration, velocity };
        setProject('clips', clipId, 'notes', (notes) => [...notes, newNote]);
    },

    /**
     * Sets the currently selected track.
     */
    selectTrack: (id: string | null) => {
        setProject('selectedTrackId', id);
    },

    /**
     * Sets the currently selected clip.
     */
    selectClip: (id: string | null) => {
        setProject('selectedClipId', id);
    },

    /**
     * Central handler for incoming MIDI events.
     * Handles both live audio triggering and recording to clips.
     */
    handleMidiEvent: (midi: number, velocity: number, type: 'noteOn' | 'noteOff') => {
        const selectedTrack = project.tracks.find((t) => t.id === project.selectedTrackId);
        if (!selectedTrack) return;

        // 1. Direct Audio Trigger
        if (type === 'noteOn') {
            audioEngine.triggerNote(selectedTrack.channelIndex, midi, velocity);
        } else {
            audioEngine.stopNote(selectedTrack.channelIndex, midi);
        }

        // 2. Recording Logic
        if (project.transport.isPlaying && project.transport.isRecording) {
            const currentBeat = project.transport.position;
            const measureSize = getMeasureLength();

            if (type === 'noteOn') {
                // Determine target clip: Existing Overlap -> Adjacent Extension -> New Clip
                let targetClip = Object.values(project.clips).find(
                    (c) => c.trackId === selectedTrack.id && currentBeat >= c.start && currentBeat < c.start + c.length
                );

                if (!targetClip) {
                    const trackClips = Object.values(project.clips)
                        .filter((c) => c.trackId === selectedTrack.id)
                        .sort((a, b) => a.start + a.length - (b.start + b.length));

                    const lastClip = trackClips[trackClips.length - 1];

                    if (lastClip) {
                        const end = lastClip.start + lastClip.length;
                        if (currentBeat >= end && currentBeat < end + 1.0) {
                            const nextMeasureBoundary = Math.ceil((currentBeat + 0.01) / measureSize) * measureSize;
                            const finalLength = nextMeasureBoundary - lastClip.start;
                            ProjectActions.updateClipParam(lastClip.id, 'length', finalLength);
                            targetClip = lastClip;
                        }
                    }
                }

                if (!targetClip) {
                    const measureStart = Math.floor(currentBeat / measureSize) * measureSize;
                    const newId = ProjectActions.addClip(selectedTrack.id, measureStart, measureSize);
                    if (newId) targetClip = project.clips[newId];
                }

                if (targetClip) {
                    activeRecordingNotes.set(midi, { start: currentBeat, clipId: targetClip.id });
                }
            } else {
                // Note Off - Finalize note entry
                const active = activeRecordingNotes.get(midi);
                if (active) {
                    const duration = currentBeat - active.start;
                    if (duration > 0.01) {
                        const clip = project.clips[active.clipId];
                        if (clip) {
                            const start = active.start - clip.start;
                            ProjectActions.addNote(active.clipId, midi, start, duration, velocity || 0.8);

                            // Extend clip if note exceeds bounds
                            const noteAbsEnd = clip.start + start + duration;
                            if (noteAbsEnd > clip.start + clip.length) {
                                const nextMeasureBoundary = Math.ceil(noteAbsEnd / measureSize) * measureSize;
                                const newLength = nextMeasureBoundary - clip.start;
                                ProjectActions.updateClipParam(clip.id, 'length', newLength);
                            }
                        }
                    }
                    activeRecordingNotes.delete(midi);
                }
            }
        }
    },

    /**
     * Toggles playback. Starts audio engine and scheduler if playing.
     */
    togglePlay: async () => {
        const bps = project.transport.tempo / 60;

        if (project.transport.isPlaying) {
            const stopTime = audioEngine.currentTime;
            const stopPosition = Math.max(0, (stopTime - project.transport.startTime) * bps);

            setProject('transport', 'position', stopPosition);
            setProject('transport', 'isPlaying', false);

            audioEngine.setPlayState(false);
            audioScheduler.stop();

            if (project.transport.isRecording) {
                setProject('transport', 'isRecording', false);
                activeRecordingNotes.clear();
            }
        } else {
            const currentPos = project.transport.position;
            const startTime = audioEngine.currentTime - currentPos / bps;

            setProject('transport', 'startTime', startTime);
            setProject('transport', 'isPlaying', true);

            audioEngine.setPosition(currentPos);
            audioEngine.setPlayState(true);

            await audioScheduler.start();
        }
    },

    /**
     * Toggles recording state. Automatically starts playback if not already playing.
     */
    toggleRecord: async () => {
        setProject('transport', 'isRecording', (r) => !r);
        if (project.transport.isRecording && !project.transport.isPlaying) {
            await ProjectActions.togglePlay();
        }
    },

    /**
     * Stops playback and recording, returning transport to 0.
     */
    stop: () => {
        setProject('transport', { isPlaying: false, isRecording: false, position: 0 });
        audioEngine.setPlayState(false);
        audioEngine.setPosition(0);
        audioScheduler.stop();
        activeRecordingNotes.clear();
    },

    /**
     * Sets the playback tempo.
     * Encapsulates logic to re-anchor the start time if playing to prevent
     * the playhead from fast-forwarding or rewinding visually.
     *
     * @param tempo - The new tempo in BPM (clamped 20-999).
     */
    setTempo: (tempo: number) => {
        const safeTempo = Math.max(20, Math.min(999, tempo));
        const previousTempo = project.transport.tempo;

        // Internal logic to apply tempo and handle time re-anchoring
        const applyTempoChange = (newTempo: number) => {
            const currentTempo = project.transport.tempo;
            const currentStartTime = project.transport.startTime;

            if (project.transport.isPlaying) {
                const currentHardwareTime = audioEngine.currentTime;
                // Calculate current position in beats
                const currentBps = currentTempo / 60;
                const currentPos = (currentHardwareTime - currentStartTime) * currentBps;

                // Calculate newStartTime with respect to the new tempo
                const newBps = newTempo / 60;
                const newStartTime = currentHardwareTime - currentPos / newBps;

                Mutators.setStartTime(newStartTime);
            }

            Mutators.setTempo(newTempo);
        };

        applyTempoChange(safeTempo);

        history.push({
            name: `Tempo to ${Math.round(safeTempo)}`,
            undo: () => {
                applyTempoChange(previousTempo);
            },
            redo: () => {
                applyTempoChange(safeTempo);
            },
        });
    },

    /**
     * Sets the playback position. Updates audio engine time accordingly.
     */
    setPosition: (beat: number) => {
        const newPos = Math.max(0, beat);
        setProject('transport', 'position', newPos);
        audioEngine.setPosition(newPos);
        if (project.transport.isPlaying) {
            const bps = project.transport.tempo / 60;
            const offset = newPos / bps;
            setProject('transport', 'startTime', audioEngine.currentTime - offset);
        }
    },

    /**
     * Configures the metronome state.
     */
    setMetronome: (isActive: boolean, volume: number) => {
        setProject('transport', 'metronome', { isActive, volume });
        audioEngine.setMetronome(isActive, volume);
    },

    /**
     * Sets the project time signature.
     * Ensures the audio engine receives the new numerator for metronome accents.
     */
    setTimeSignature: (num: number, den: number) => {
        const oldNum = project.transport.timeSignature.numerator;
        const oldDen = project.transport.timeSignature.denominator;

        Mutators.setTimeSignature(num, den);

        history.push({
            name: `Time Sig ${num}/${den}`,
            undo: () => Mutators.setTimeSignature(oldNum, oldDen),
            redo: () => Mutators.setTimeSignature(num, den),
        });
    },

    /**
     * Sets the project key signature.
     */
    setKeySignature: (root: string, scale: 'Major' | 'Minor') => {
        setProject('transport', 'keySignature', { root, scale });
    },

    /**
     * Sets the horizontal zoom level for the arrangement view.
     */
    setZoom: (level: number) => {
        setProject('view', 'zoomLevel', Math.max(0.1, Math.min(5.0, level)));
    },

    /**
     * Toggles the snap-to-grid feature.
     */
    toggleSnap: () => {
        setProject('view', 'snapToGrid', (s) => !s);
    },
};
