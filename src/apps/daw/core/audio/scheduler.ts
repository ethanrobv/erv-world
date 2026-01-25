import { audioEngine } from './audio-context';
import { project, setProject } from '../../store/project';

/**
 * The duration in seconds to look ahead for scheduling audio events.
 * A larger window prevents dropouts but may decrease responsiveness to immediate changes.
 */
const LOOKAHEAD = 0.1;

/**
 * The interval in milliseconds at which the scheduler loop runs.
 */
const SCHEDULER_INTERVAL = 25;

/**
 * Manages the timing and triggering of audio notes based on the project timeline.
 * Uses a Lookahead pattern to ensure precise timing independent of the main thread visual refresh rate.
 */
export class AudioScheduler {
    private engine: typeof audioEngine;
    private timerID: number | null = null;
    private lastScheduledBeat: number = 0;

    /**
     * Public flag indicating if the scheduler loop is currently active.
     */
    public isRunning: boolean = false;

    constructor(engine: typeof audioEngine) {
        this.engine = engine;
    }

    /**
     * Starts the scheduling loop.
     * Resumes the AudioContext if necessary and synchronizes the transport state.
     */
    async start() {
        if (this.isRunning) return;

        // Ensure AudioContext is running before scheduling
        await this.engine.resume();
        this.isRunning = true;

        // Sync the last scheduled beat to the current transport position to prevent double triggering
        this.lastScheduledBeat = project.transport.position;

        // Calculate the anchor time for synchronization
        // Start Time equals Current Audio Time minus Current Beats times Seconds Per Beat
        const bps = project.transport.tempo / 60;
        const timeOffset = project.transport.position / bps;
        setProject('transport', 'startTime', this.engine.currentTime - timeOffset);

        this.scheduleLoop();
    }

    /**
     * Stops the scheduling loop and clears any pending timers.
     */
    stop() {
        this.isRunning = false;
        if (this.timerID) {
            window.clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    /**
     * The main scheduling loop.
     * 1. Calculates the time window to cover.
     * 2. Finds notes within that window.
     * 3. Triggers audio events.
     * 4. Updates the UI playhead position.
     */
    private scheduleLoop = () => {
        // Verify playback state
        if (!project.transport.isPlaying) {
            this.stop();
            return;
        }

        const currentTime = this.engine.currentTime;
        const tempo = project.transport.tempo;
        const bps = tempo / 60;

        // Calculate the current visual position based on audio time for smooth UI
        const currentSongBeat = Math.max(0, (currentTime - project.transport.startTime) * bps);

        // Update UI Transport Position
        setProject('transport', 'position', currentSongBeat);

        // Calculate the window of time in beats we need to schedule
        const scheduleUntilBeat = currentSongBeat + LOOKAHEAD * bps;

        // Iterate through all clips to find notes falling within the window
        Object.values(project.clips).forEach((clip) => {
            const track = project.tracks.find((t) => t.id === clip.trackId);

            // Skip processing if track is muted or missing
            if (!track || track.isMuted) return;

            clip.notes.forEach((note) => {
                // Ignore notes that start outside the active length of the clip
                if (note.start >= clip.length) return;

                const noteAbsStart = clip.start + note.start;

                // Check if the note starts within the current lookahead window
                if (noteAbsStart >= this.lastScheduledBeat && noteAbsStart < scheduleUntilBeat) {
                    // Trigger Note On immediately
                    this.engine.triggerNote(track.channelIndex, note.midi, note.velocity);

                    // Calculate the effective duration.
                    // If a note extends past the clip boundary, clamp it so it stops exactly at the end of the clip.
                    const effectiveDuration = Math.min(note.duration, clip.length - note.start);

                    // Schedule Note Off
                    // Since the engine handles realtime events, use a JS timer to send the Note Off command
                    const durationMs = (effectiveDuration / bps) * 1000;
                    setTimeout(() => {
                        this.engine.stopNote(track.channelIndex, note.midi);
                    }, durationMs);
                }
            });
        });

        // Advance the scheduling cursor
        this.lastScheduledBeat = scheduleUntilBeat;

        // Schedule next iteration
        if (this.isRunning) {
            this.timerID = window.setTimeout(this.scheduleLoop, SCHEDULER_INTERVAL);
        }
    };
}

// A singleton instance for use in the Project Store
export const audioScheduler = new AudioScheduler(audioEngine);
