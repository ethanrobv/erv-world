/**
 * Represents the specific time of day in the game world.
 * This is used to determine lighting, background gradients, and celestial positioning.
 */
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'midnight';

/**
 * Represents the current weather condition in the game world.
 * This is used to overlay environmental effects and adjust color saturation/brightness.
 */
export type Weather = 'clear' | 'stormy' | 'rainy' | 'foggy';

/**
 * Represents the current seasonal cycle.
 * Used to shift the color palette (e.g., warmer oranges vs cooler blues).
 */
export type Season = 'warm' | 'cold';

/**
 * The aggregate state object representing the current environmental conditions.
 */
export interface ThemeState {
    time: TimeOfDay;
    weather: Weather;
    season: Season;
}
