import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { useNetworkStore } from '../../store/networkStore';
import { networkManager } from '../../network/NetworkManager';
import { PacketType } from '../../network/Protocol';
import { MINUTES_PER_DAY } from '../mechanics/TimeSystem';

export const WorldClock = () => {
    // 1. Reactive State (Hooks)
    // We only need 'role' to decide if we are the Host.
    const role = useNetworkStore((state) => state.role);

    // 2. Refs (Mutable state that persists across frames without re-rendering)
    const lastBroadcast = useRef(0);
    const lastWeatherRoll = useRef(0);

    // Game Speed: 1.66 game minutes per real second
    const TIME_SCALE = 100;

    useFrame((_state, delta) => {
        // 3. Transient State (Fetched freshly every single frame)
        // We use .getState() here to ensure we always have the latest values
        // without forcing the React component to re-render.
        const store = useGameStore.getState();
        const currentT = store.gameTime;

        // --- COMMON LOGIC (ALL PEERS) ---
        // Advance time locally for smooth interpolation
        const newTime = currentT + delta * (TIME_SCALE / 60);

        // --- HOST LOGIC (AUTHORITY) ---
        if (role === 'HOST' || role === 'NONE') {
            let nextWeather = store.weather;
            let nextSeason = store.season;

            // RNG: Check for weather change every 60 in-game minutes
            if (newTime - lastWeatherRoll.current > 60) {
                lastWeatherRoll.current = newTime;

                // 10% chance to change weather
                if (Math.random() < 0.1) {
                    const roll = Math.random();
                    if (roll < 0.6) nextWeather = 0;      // Clear
                    else if (roll < 0.8) nextWeather = 1; // Rainy
                    else if (roll < 0.95) nextWeather = 3;// Foggy
                    else nextWeather = 2;                 // Stormy
                }
            }

            // Commit updates to the store
            const wrappedTime = newTime % MINUTES_PER_DAY;
            store.setGlobalState(wrappedTime, nextWeather, nextSeason);

            // Broadcast updates to network (Every 5 real seconds)
            const now = Date.now();
            if (role === 'HOST' && now - lastBroadcast.current > 5000) {
                networkManager.broadcast({
                    t: PacketType.GLOBAL_STATE,
                    d: { type: 1, val: wrappedTime }
                });
                networkManager.broadcast({
                    t: PacketType.GLOBAL_STATE,
                    d: { type: 0, val: nextWeather }
                });
                lastBroadcast.current = now;
            }
        } else {
            // --- CLIENT LOGIC ---
            // Just smooth interpolation.
            // The "Hard" sync happens when a packet arrives in NetworkManager.
            store.setGlobalState(newTime % MINUTES_PER_DAY, store.weather, store.season);
        }
    });

    return null;
};
