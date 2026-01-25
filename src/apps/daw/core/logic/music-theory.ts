/**
 * Maps pitch class indices (0-11) to note names.
 * Used for root detection.
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Detects a chord name from a set of active MIDI notes.
 * @param notes A set of MIDI note numbers.
 * @returns A string representation of the chord (e.g., 'C Maj7') or empty string.
 */
export function detectChord(notes: Set<number>): string {
    if (notes.size < 3) return '';

    // Sort unique pitch classes (0-11)
    const pitchClasses = Array.from(notes)
        .map((n) => n % 12)
        .sort((a, b) => a - b);

    // Remove duplicates
    const uniquePitches = [...new Set(pitchClasses)];
    if (uniquePitches.length < 3) return '';

    // Brute force check for root positions
    // We try every note in the set as a potential root
    for (let i = 0; i < uniquePitches.length; i++) {
        const root = uniquePitches[i];
        const intervals = uniquePitches.map((p) => (p - root + 12) % 12).sort((a, b) => a - b);

        // Check against known interval signatures
        const name = matchIntervals(intervals);
        if (name) {
            return `${NOTE_NAMES[root]} ${name}`;
        }
    }

    return '';
}

/**
 * Matches a sorted list of intervals (relative to 0) to a chord quality.
 */
function matchIntervals(intervals: number[]): string | null {
    const key = intervals.join(',');

    switch (key) {
        // Triads
        case '0,4,7':
            return 'Maj';
        case '0,3,7':
            return 'Min';
        case '0,3,6':
            return 'Dim';
        case '0,4,8':
            return 'Aug';
        case '0,2,7':
            return 'Sus2';
        case '0,5,7':
            return 'Sus4';

        // Sevenths
        case '0,4,7,11':
            return 'Maj7';
        case '0,3,7,10':
            return 'm7';
        case '0,4,7,10':
            return 'Dom7';
        case '0,3,7,11':
            return 'mMaj7';
        case '0,3,6,10':
            return 'm7b5'; // Half-dim
        case '0,3,6,9':
            return 'Dim7';

        default:
            return null;
    }
}
