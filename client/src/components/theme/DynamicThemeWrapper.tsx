'use client';
import { useEffect } from 'react';
import { GameEvents } from '@/game/core/GameEvents';

export default function DynamicThemeWrapper({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Listen for time updates from Phaser (TimeSystem.ts)
        const handleTimeUpdate = (hour: number) => {
            const root = document.documentElement;

            // Calculate Day/Night Cycle (0-24)
            // Day: 6am - 6pm (18)
            // Night: 6pm - 6am

            let bg, border, accent, text;

            if (hour >= 6 && hour < 17) {
                // DAY THEME (Solar)
                bg = '#2d4f6c';       // Deep Blue Sky
                border = '#f5d76e';   // Sun Gold
                accent = '#e67e22';   // Warm Orange
                text = '#ffffff';
            } else if (hour >= 17 && hour < 20) {
                // SUNSET THEME (Dusk)
                bg = '#4a2c4a';       // Purple Haze
                border = '#f0932b';   // Setting Sun
                accent = '#badc58';   // Fading Light
                text = '#ffecd1';
            } else {
                // NIGHT THEME (Lunar)
                bg = '#0d1117';       // Void Black
                border = '#30363d';   // Dim Grey
                accent = '#58a6ff';   // Star Blue
                text = '#c9d1d9';
            }

            // Update CSS Variables for Tailwind
            root.style.setProperty('--color-retro-bg', bg);
            root.style.setProperty('--color-retro-border', border);
            root.style.setProperty('--color-retro-accent', accent);
            root.style.setProperty('--color-retro-text', text);
        };

        GameEvents.on('TIME_UPDATE', handleTimeUpdate);
        return () => {
            GameEvents.off('TIME_UPDATE', handleTimeUpdate);
        };
    }, []);

    return <>{ children }</>;
}
