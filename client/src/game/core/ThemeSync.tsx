import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../context/ThemeContext';
import { getTimeOfDay, getWeatherState, getSeasonState } from '../mechanics/TimeSystem';

/**
 * THEME SYNC
 * Bridges the Game Logic (Store) with the UI/CSS System (ThemeContext).
 */
export const ThemeSync = () => {
    const { setTime, setWeather, setSeason } = useTheme();

    useEffect(() => {
        // 1. Subscribe to Time Changes
        const unsubTime = useGameStore.subscribe(
            (state) => getTimeOfDay(state.gameTime),
            (newTime) => setTime(newTime),
            { equalityFn: (a, b) => a === b }
        );

        // 2. Subscribe to Weather Changes
        const unsubWeather = useGameStore.subscribe(
            (state) => getWeatherState(state.weather),
            (newWeather) => setWeather(newWeather),
            { equalityFn: (a, b) => a === b }
        );

        // 3. Subscribe to Season Changes
        const unsubSeason = useGameStore.subscribe(
            (state) => getSeasonState(state.season),
            (newSeason) => setSeason(newSeason),
            { equalityFn: (a, b) => a === b }
        );

        return () => {
            unsubTime();
            unsubWeather();
            unsubSeason();
        };
    }, [setTime, setWeather, setSeason]);

    return null;
};
