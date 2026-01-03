export interface ThemePalette {
    primary: string;
    secondary: string;
    bg: string;
    surface: string;
    accent: string;
}

export interface PlanetDef {
    id: string;
    name: string;
    dayLengthMinutes: number;
    palettes: {
        day: ThemePalette;
        night: ThemePalette;
        sunset: ThemePalette;
    };
}

export const PLANETS: Record<string, PlanetDef> = {
    earth: {
        id: 'earth',
        name: 'Earth',
        dayLengthMinutes: 1440,
        palettes: {
            day: {
                primary: '#3b82f6',
                secondary: '#60a5fa',
                bg: '#eff6ff',
                surface: '#ffffff',
                accent: '#f59e0b',
            },
            sunset: {
                primary: '#f97316',
                secondary: '#fdba74',
                bg: '#fff7ed',
                surface: '#fffaf0',
                accent: '#7c2d12',
            },
            night: {
                primary: '#6366f1',
                secondary: '#818cf8',
                bg: '#1e1b4b',
                surface: '#312e81',
                accent: '#c7d2fe',
            },
        },
    },
    mars: {
        id: 'mars',
        name: 'Mars',
        dayLengthMinutes: 1480,
        palettes: {
            day: {
                primary: '#ef4444',
                secondary: '#f87171',
                bg: '#fef2f2',
                surface: '#ffffff',
                accent: '#b91c1c',
            },
            sunset: {
                primary: '#7f1d1d',
                secondary: '#991b1b',
                bg: '#450a0a',
                surface: '#7f1d1d',
                accent: '#fca5a5',
            },
            night: {
                primary: '#a855f7',
                secondary: '#c084fc',
                bg: '#2e1065',
                surface: '#581c87',
                accent: '#e9d5ff',
            },
        },
    },
};
