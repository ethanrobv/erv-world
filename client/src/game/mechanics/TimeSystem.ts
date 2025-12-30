import type { TimeOfDay, Weather, Season } from '../../types/theme';

export const MINUTES_PER_DAY = 1440;
export const SEASON_LENGTH_DAYS = 3;

/**
 * Maps raw minute value (0-1440) to discrete TimeOfDay buckets.
 */
export const getTimeOfDay = (minutes: number): TimeOfDay => {
    const t = minutes % MINUTES_PER_DAY;

    if (t >= 300 && t < 420) return 'dawn';       // 5:00 AM - 7:00 AM
    if (t >= 420 && t < 720) return 'morning';    // 7:00 AM - 12:00 PM
    if (t >= 720 && t < 960) return 'noon';       // 12:00 PM - 4:00 PM
    if (t >= 960 && t < 1140) return 'afternoon'; // 4:00 PM - 7:00 PM
    if (t >= 1140 && t < 1260) return 'dusk';     // 7:00 PM - 9:00 PM
    return 'midnight';                            // 9:00 PM - 5:00 AM
};

/**
 * Maps numerical weather states to string identifiers.
 */
export const getWeatherState = (index: number): Weather => {
    switch (index) {
        case 1:
            return 'rainy';
        case 2:
            return 'stormy';
        case 3:
            return 'foggy';
        default:
            return 'clear';
    }
};

/**
 * Maps numerical season states to string identifiers for CSS.
 * 0 = Warm, 1 = Cold
 */
export const getSeasonState = (index: number): Season => {
    return index === 1 ? 'cold' : 'warm';
};

/**
 * Formats game time into a human-readable 12-hour clock string.
 */
export const formatGameTime = (minutes: number): string => {
    const totalMinutes = Math.floor(minutes) % MINUTES_PER_DAY;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    const suffix = hrs >= 12 ? 'PM' : 'AM';
    const formattedHrs = hrs % 12 || 12;
    const formattedMins = mins.toString().padStart(2, '0');
    return `${ formattedHrs }:${ formattedMins } ${ suffix }`;
};

/**
 * Formats the season index into a display string for the HUD.
 */
export const formatSeasonName = (index: number): string => {
    return index === 1 ? 'Cold Season' : 'Warm Season';
};
