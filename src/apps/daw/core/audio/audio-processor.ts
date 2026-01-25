interface WasmExports extends WebAssembly.Exports {
    alloc_shared_state: () => number;
    alloc_f32_array: (len: number) => number;
    set_sample_rate: (sr: number) => void;
    process: (ptr: number, len: number) => boolean;
}

class DawProcessor extends AudioWorkletProcessor {
    private wasm: WasmExports | null = null;
    private memory: WebAssembly.Memory | null = null;

    private outputPtr: number = 0;
    private outputView: Float32Array | null = null;

    // Web Audio processes 128 frames per block.
    // For Stereo Interleaved (L, R, L, R), we need 2 floats per frame.
    // 128 * 2 = 256 floats total.
    private readonly BLOCK_SIZE = 128;
    private readonly BUFFER_SIZE = 128 * 2;

    constructor() {
        super();
        this.port.onmessage = this.handleMessage.bind(this);
    }

    async handleMessage(e: MessageEvent) {
        if (e.data.type === 'INIT_WASM') {
            try {
                const module = await WebAssembly.compile(e.data.wasmBytes);

                // Store the Memory Object directly
                this.memory = e.data.memory;

                const imports = {
                    env: {
                        memory: this.memory,
                    },
                };

                const instance = await WebAssembly.instantiate(module, imports as WebAssembly.Imports);
                this.wasm = instance.exports as WasmExports;

                if (this.wasm.set_sample_rate) {
                    // Use global scope sampleRate provided by AudioWorkletGlobalScope
                    this.wasm.set_sample_rate(sampleRate);
                }

                const statePtr = this.wasm.alloc_shared_state();

                // Allocate 2x buffer for Stereo Interleaved data (256 floats)
                this.outputPtr = this.wasm.alloc_f32_array(this.BUFFER_SIZE);

                this.updateViews();

                this.port.postMessage({
                    type: 'WASM_READY',
                    statePtr: statePtr,
                });
            } catch (err) {
                this.port.postMessage({ type: 'ERROR', message: String(err) });
            }
        }
    }

    updateViews() {
        if (!this.wasm || !this.memory) return;

        const heap = this.memory.buffer as unknown as SharedArrayBuffer;
        // View the full stereo buffer (256 floats)
        this.outputView = new Float32Array(heap, this.outputPtr, this.BUFFER_SIZE);
    }

    // noinspection JSUnusedGlobalSymbols
    process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
        if (!this.wasm || !this.outputView) return true;

        if (this.outputView.buffer.byteLength === 0) {
            this.updateViews();
        }

        // Rust generates 128 stereo frames (256 floats)
        // Pass BUFFER_SIZE (256) so the loop in Rust runs correctly
        this.wasm.process(this.outputPtr, this.BUFFER_SIZE);

        const output = outputs[0];
        const leftChannel = output[0];
        const rightChannel = output[1];

        // De-interleave: Rust [L, R, L, R...] -> WebAudio [L, L...] & [R, R...]
        for (let i = 0; i < this.BLOCK_SIZE; i++) {
            leftChannel[i] = this.outputView[i * 2];
            // Safety check in case the host only provided a mono output
            if (rightChannel) {
                rightChannel[i] = this.outputView[i * 2 + 1];
            }
        }

        return true;
    }
}

registerProcessor('daw-processor', DawProcessor);
