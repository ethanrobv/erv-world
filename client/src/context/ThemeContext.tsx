import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import type { TimeOfDay, Weather, Season } from '../types/theme';

interface ThemeContextType {
    time: TimeOfDay;
    weather: Weather;
    season: Season;
    setTime: (time: TimeOfDay) => void;
    setWeather: (weather: Weather) => void;
    setSeason: (season: Season) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [time, setTime] = useState<TimeOfDay>('morning');
    const [weather, setWeather] = useState<Weather>('clear');
    const [season, setSeason] = useState<Season>('warm');

    /**
     * Effect to sync React state with DOM attributes.
     * This enables the CSS Attribute Matrix to function.
     */
    useEffect(() => {
        document.documentElement.setAttribute('data-time', time);
        document.documentElement.setAttribute('data-weather', weather);
        document.documentElement.setAttribute('data-season', season); // [NEW]
    }, [time, weather, season]);

    return (
        <ThemeContext.Provider value={ { time, weather, season, setTime, setWeather, setSeason } }>
            { children }
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
