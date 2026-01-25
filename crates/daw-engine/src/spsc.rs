#![allow(dead_code)]

use crate::event::AudioCommand;
use std::sync::atomic::{AtomicU32, Ordering};

/// Header structure for the Ring Buffer.
/// Defines the synchronization primitives used by Producer (Host) and Consumer (Engine).
///
/// Layout:
/// - Offset 0x00: `write_head` (4 bytes)
/// - Offset 0x04: `read_head` (4 bytes)
/// - Offset 0x08: Padding (8 bytes) implicitly handled by offset calculation below.
#[repr(C)]
pub struct RbHeader {
    /// Atomic index indicating where the Producer (Host) inserts the next item.
    /// Modified only by the Producer; read by the Consumer.
    pub write_head: AtomicU32,

    /// Atomic index indicating where the Consumer (Engine) reads the next item.
    /// Modified only by the Consumer; read by the Producer.
    pub read_head: AtomicU32,
}

/// A Single-Producer Single-Consumer (SPSC) Ring Buffer Reader.
/// This structure is designed for high-performance, lock-free reading on the Audio Thread.
pub struct Consumer {
    /// Pointer to the synchronization header.
    header: *const RbHeader,
    /// Pointer to the contiguous array of commands.
    buffer: *const AudioCommand,
    /// The maximum number of elements in the buffer. Must be a power of two.
    capacity: u32,
    /// Pre-calculated mask (capacity - 1) for fast bitwise wrapping.
    mask: u32,
}

/// Safety: The Consumer is Send/Sync because it only reads data that has been
/// published (released) by the Producer. Access is synchronized via atomic indices.
unsafe impl Send for Consumer {}
unsafe impl Sync for Consumer {}

impl Consumer {
    /// Creates a new Consumer from a raw memory pointer.
    ///
    /// # Safety
    /// 1. `base_ptr` must be valid and aligned.
    /// 2. `capacity` must be a power of two (e.g., 1024) to allow for bitwise masking.
    /// 3. The layout at `base_ptr` must match `SharedState` layout: Header (8 bytes) + Padding (8 bytes) -> Data starts at 16.
    pub unsafe fn new(base_ptr: *mut u8, capacity: u32) -> Self {
        // Cast the base pointer to the header struct
        let header = base_ptr as *const RbHeader;

        // Calculate offset to the data region.
        // CRITICAL: The header is 8 bytes, but AudioCommand is aligned to 16 bytes.
        // Therefore, the compiler inserts 8 bytes of padding after the header in SharedState.
        // We MUST start reading commands from offset 16, not 8.
        let buffer_offset = 16;

        // SAFETY: We explicitly add 16 bytes to the base pointer to skip header + padding.
        let buffer = unsafe { base_ptr.add(buffer_offset) as *const AudioCommand };

        Consumer {
            header,
            buffer,
            capacity,
            mask: capacity - 1,
        }
    }

    /// Attempts to read the next command from the buffer.
    /// Returns `None` if the buffer is empty.
    ///
    /// # Synchronization
    /// Uses `Acquire` ordering on the write head to ensure all data writes by the
    /// Producer are visible before we read the command.
    pub fn pop(&self) -> Option<AudioCommand> {
        unsafe {
            let header = &*self.header;

            // 1. Load the Producer's write index (Acquire ensures data visibility)
            let write_idx = header.write_head.load(Ordering::Acquire);

            // 2. Load our own read index (Relaxed is safe as we are the only writer to it)
            let read_idx = header.read_head.load(Ordering::Relaxed);

            // 3. Check for empty buffer
            if read_idx == write_idx {
                return None;
            }

            // 4. Calculate wrapped index using bitwise AND (faster than modulo)
            let index = (read_idx & self.mask) as usize;

            // 5. Read the data
            let command = *self.buffer.add(index);

            // 6. Update the read index (Release notifies Producer that slot is free)
            header
                .read_head
                .store(read_idx.wrapping_add(1), Ordering::Release);

            Some(command)
        }
    }
}
