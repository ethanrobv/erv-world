mod channel;
mod engine;
mod event;
mod instrument;
mod metronome;
mod spsc;
mod voice;

use std::cell::UnsafeCell;
use std::ptr;
use std::sync::atomic::{AtomicU32, Ordering};

/// A thread-safe wrapper around UnsafeCell to allow use in static variables.
/// SAFETY: The user must ensure that the Wasm module is single-threaded
/// or that access is externally synchronized (guaranteed by the Web Audio API AudioWorklet scope).
struct SyncUnsafeCell<T>(UnsafeCell<T>);

unsafe impl<T> Sync for SyncUnsafeCell<T> {}

impl<T> SyncUnsafeCell<T> {
    const fn new(value: T) -> Self {
        Self(UnsafeCell::new(value))
    }

    /// Returns a mutable raw pointer to the underlying data.
    fn get(&self) -> *mut T {
        self.0.get()
    }
}

/// Capacity of the ring buffer used for IPC commands.
/// Must be a power of two for efficient bitwise masking.
const RING_BUFFER_CAPACITY: usize = 1024;

/// Represents the shared memory region accessible by both the Host JS and the Engine Wasm.
/// The layout is strictly aligned to 16 bytes to match the AudioCommand alignment.
#[repr(C)]
pub struct SharedState {
    /// Atomic write index (modified by Host).
    pub write_head: AtomicU32,
    /// Atomic read index (modified by Engine).
    pub read_head: AtomicU32,
    /// Padding to ensure `events` starts at offset 16 (0x10).
    pub _padding: [u32; 2],
    /// Circular buffer of audio commands.
    pub events: [event::AudioCommand; RING_BUFFER_CAPACITY],
}

// Global State Pointers (initialized in alloc_shared_state)
static STATE_PTR: SyncUnsafeCell<*mut SharedState> = SyncUnsafeCell::new(ptr::null_mut());
static ENGINE_PTR: SyncUnsafeCell<*mut engine::Engine> = SyncUnsafeCell::new(ptr::null_mut());

/// Allocates the shared state structure on the heap.
/// This function is called by the Host during initialization.
#[unsafe(no_mangle)]
pub extern "C" fn alloc_shared_state() -> *mut SharedState {
    // Allocate SharedState safely on the heap
    let state = Box::new(SharedState {
        write_head: AtomicU32::new(0),
        read_head: AtomicU32::new(0),
        _padding: [0; 2],
        events: [event::AudioCommand::default(); RING_BUFFER_CAPACITY],
    });

    let ptr = Box::into_raw(state);

    unsafe {
        *STATE_PTR.get() = ptr;

        // Initialize the Polyphonic Engine with default sample rate (updated later)
        let engine = Box::new(engine::Engine::new(44100.0));
        *ENGINE_PTR.get() = Box::into_raw(engine);
    }

    ptr
}

/// Main audio processing callback.
/// 1. Reads events from the shared ring buffer.
/// 2. Updates engine state.
/// 3. Generates the next block of audio samples.
#[unsafe(no_mangle)]
pub extern "C" fn process(output_ptr: *mut f32, length: usize) -> bool {
    unsafe {
        let state_ptr = *STATE_PTR.get();
        let engine_ptr = *ENGINE_PTR.get();

        // Fail gracefully if initialization is incomplete
        if state_ptr.is_null() || engine_ptr.is_null() {
            return true;
        }

        let state = &*state_ptr;
        let engine = &mut *engine_ptr;

        // Event Processing (Consumer)
        let mut read = state.read_head.load(Ordering::Acquire);
        let write = state.write_head.load(Ordering::Acquire);
        let mask = RING_BUFFER_CAPACITY - 1;

        // Drain the ring buffer of all pending commands
        while read != write {
            let index = (read as usize) & mask;
            let command = state.events[index];

            engine.handle_event(command);

            read = read.wrapping_add(1);
        }

        state.read_head.store(read, Ordering::Release);

        // Audio Synthesis
        let output_slice = std::slice::from_raw_parts_mut(output_ptr, length);
        engine.process_block(output_slice);
    }
    true
}

/// Updates the sample rate of the audio engine.
/// Called by the Host when the AudioContext sample rate is known.
#[unsafe(no_mangle)]
pub extern "C" fn set_sample_rate(sr: f32) {
    unsafe {
        let engine_ptr = *ENGINE_PTR.get();
        if !engine_ptr.is_null() {
            (*engine_ptr).set_sample_rate(sr);
        }
    }
}

/// Helper: Allocates a floating point array in Wasm memory.
/// Used by the Host to create input/output buffers for `process`.
#[unsafe(no_mangle)]
pub extern "C" fn alloc_f32_array(len: usize) -> *mut f32 {
    let mut vec = vec![0.0f32; len];
    let ptr = vec.as_mut_ptr();
    std::mem::forget(vec); // Prevent Rust from freeing memory at end of scope
    ptr
}
