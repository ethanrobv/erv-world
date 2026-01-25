import processorUrl from './audio-processor.ts?worker&url';

// Operation Codes (See `daw-engine/src/event.rs`)
const OP_NOTE_OFF = 0;
const OP_NOTE_ON = 1;
const OP_PARAM = 2;
const OP_METRONOME = 3;
const OP_TRANSPORT = 4;
const OP_POSITION = 5;
const OP_PLAY_STATE = 6;
const OP_CONFIG = 7;

/**
 * The Host Controller for the WebAssembly Audio Engine.
 *
 * This class serves as the 'Producer' in the Single-Producer Single-Consumer (SPSC)
 * ring buffer architecture. It manages the SharedArrayBuffer and writes commands
 * (Notes, Parameters, Transport) directly into memory that the Rust Engine reads.
 *
 * MEMORY LAYOUT (See `daw-engine/src/lib.rs` and `daw-engine/src/event.rs`):
 * - Offset 0x00: write_head (Uint32)
 * - Offset 0x04: read_head  (Uint32)
 * - Offset 0x08: Padding    (8 bytes)
 * - Offset 0x10: Events Array Start
 *
 * EVENT STRUCT LAYOUT (16 Bytes):
 * - +00: operation (Uint32)
 * - +04: target    (Uint32)
 * - +08: value     (Float32)
 * - +12: channel   (Uint32)
 */
export class AudioEngine {
    public context: AudioContext;
    private node: AudioWorkletNode | null = null;
    private wasmMemory: WebAssembly.Memory | null = null;

    // Ring Buffer Views
    private writeHead: Uint32Array | null = null;
    private readHead: Uint32Array | null = null;

    // DataView allows us to write mixed types (u32, f32) to the buffer
    private commandView: DataView | null = null;
    // The absolute byte offset where the event buffer starts in the SharedArrayBuffer
    private bufferByteOffset = 0;

    // Configuration constants must match Rust side
    private readonly CAPACITY = 1024;
    private readonly EVENT_SIZE_BYTES = 16;

    constructor() {
        this.context = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 48000,
        });
    }

    /**
     * @returns The current audio context hardware time in seconds.
     */
    public get currentTime(): number {
        return this.context.currentTime;
    }

    /**
     * @returns The total output latency (hardware + internal buffers) in seconds.
     * Use this to synchronize visual elements (playhead) with heard audio.
     */
    public get outputLatency(): number {
        // Fallback for browsers that might not implement outputLatency explicitly
        return this.context.outputLatency + (this.context.baseLatency || 0.0);
    }

    /**
     * Resumes the audio context if it is suspended.
     */
    public async resume() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * Initializes the Audio Worklet and WebAssembly module.
     * @param wasmUrl - The URL to the .wasm file.
     */
    async init(wasmUrl: string) {
        await this.resume();

        try {
            await this.context.audioWorklet.addModule(processorUrl);
        } catch (err) {
            console.error('[AudioEngine] Failed to load AudioWorklet:', err);
            throw err;
        }

        this.node = new AudioWorkletNode(this.context, 'daw-processor', {
            outputChannelCount: [2],
            processorOptions: {},
        });

        this.node.onprocessorerror = (e) => console.error('[AudioEngine] Processor Error:', e);
        this.node.connect(this.context.destination);

        const res = await fetch(wasmUrl);
        const bytes = await res.arrayBuffer();

        // Create Shared Memory: 256 pages (16MB) min
        this.wasmMemory = new WebAssembly.Memory({
            initial: 256,
            maximum: 1600,
            shared: true,
        });

        await new Promise<void>((resolve, reject) => {
            const handler = (e: MessageEvent) => {
                if (e.data.type === 'WASM_READY') {
                    try {
                        this.mapSharedState(e.data.statePtr);
                        this.node?.port.removeEventListener('message', handler);

                        // CRITICAL: Configure the engine with the actual AudioContext sample rate immediately.
                        // Rust defaults to 44.1k; if Context is 48k, timing will drift significantly.
                        this.pushCommand(OP_CONFIG, 0, this.context.sampleRate, 0);

                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                } else if (e.data.type === 'ERROR') {
                    reject(new Error(`AudioWorklet Error: ${e.data.message}`));
                }
            };

            if (this.node) {
                this.node.port.addEventListener('message', handler);
                this.node.port.start();
                this.node.port.postMessage({
                    type: 'INIT_WASM',
                    wasmBytes: bytes,
                    memory: this.wasmMemory,
                });
            } else {
                reject(new Error('AudioNode not initialized'));
            }
        });
    }

    /**
     * Maps the SharedArrayBuffer to local TypedArrays based on the Rust struct layout.
     * @param ptr - The pointer address returned by `alloc_shared_state` in Rust.
     */
    private mapSharedState(ptr: number) {
        if (!this.wasmMemory) throw new Error('Wasm memory not initialized');
        const buffer = this.wasmMemory.buffer as unknown as SharedArrayBuffer;

        this.writeHead = new Uint32Array(buffer, ptr, 1);
        this.readHead = new Uint32Array(buffer, ptr + 4, 1);

        // Rust Layout: write_head(4) + read_head(4) + padding(8) = 16 bytes.
        this.bufferByteOffset = ptr + 16;
        this.commandView = new DataView(buffer);
    }

    /**
     * Internal helper to write a command struct to the ring buffer.
     * Uses Atomics for thread-safe synchronization with the audio thread.
     */
    private pushCommand(op: number, target: number, value: number, channel: number) {
        if (!this.writeHead || !this.readHead || !this.commandView) return;

        const writeIdx = Atomics.load(this.writeHead, 0);
        const readIdx = Atomics.load(this.readHead, 0);

        // Check Capacity using unsigned arithmetic to handle overflow gracefully
        if ((writeIdx - readIdx) >>> 0 >= this.CAPACITY) {
            console.warn(`[AudioEngine] Buffer Overflow. Dropping Op ${op}`);
            return;
        }

        const mask = this.CAPACITY - 1;
        const index = writeIdx & mask;
        const byteOffset = this.bufferByteOffset + index * this.EVENT_SIZE_BYTES;

        // Write Struct Data (Little Endian)
        this.commandView.setUint32(byteOffset, op, true); // +00: Op
        this.commandView.setUint32(byteOffset + 4, target, true); // +04: Target
        this.commandView.setFloat32(byteOffset + 8, value, true); // +08: Value
        this.commandView.setUint32(byteOffset + 12, channel, true); // +12: Channel

        // Commit: Update write head with release ordering
        Atomics.store(this.writeHead, 0, writeIdx + 1);
    }

    // Public API

    /**
     * Triggers a Note On event.
     * @param channel - The instrument channel index (0-15).
     * @param note - MIDI note number (0-127).
     * @param velocity - Note velocity (0.0-1.0).
     */
    triggerNote(channel: number, note: number, velocity: number = 1.0) {
        this.pushCommand(OP_NOTE_ON, note, velocity, channel);
    }

    /**
     * Triggers a Note Off event.
     * @param channel - The instrument channel index (0-15).
     * @param note - MIDI note number (0-127).
     */
    stopNote(channel: number, note: number) {
        this.pushCommand(OP_NOTE_OFF, note, 0.0, channel);
    }

    /**
     * Sends a parameter change to a specific channel.
     * @param channel - The instrument channel index (0-15).
     * @param paramId - The ID of the parameter.
     * @param value - The new value.
     */
    sendParam(channel: number, paramId: number, value: number) {
        this.pushCommand(OP_PARAM, paramId, value, channel);
    }

    /**
     * Updates the metronome configuration.
     * @param active - Whether the click is enabled.
     * @param volume - The volume of the click (0.0 - 1.0).
     */
    setMetronome(active: boolean, volume: number) {
        this.pushCommand(OP_METRONOME, active ? 1 : 0, volume, 0);
    }

    /**
     * Updates the global transport tempo and time signature.
     * @param tempo - The new tempo in BPM.
     * @param numerator - The number of beats per measure (for metronome accents).
     */
    setTransport(tempo: number, numerator: number = 4) {
        this.pushCommand(OP_TRANSPORT, numerator, tempo, 0);
    }

    /**
     * Sets the engine's playback position (Seek).
     * @param beat - The new playhead position in beats.
     */
    setPosition(beat: number) {
        this.pushCommand(OP_POSITION, 0, beat, 0);
    }

    /**
     * Sets the engine's internal playback state.
     * @param isPlaying - True to start the transport clock, False to stop.
     */
    setPlayState(isPlaying: boolean) {
        this.pushCommand(OP_PLAY_STATE, isPlaying ? 1 : 0, 0.0, 0);
    }
}
