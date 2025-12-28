import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import type { TimeOfDay, Weather } from '../types/theme';

/**
 * Defines the shape of the context object provided by ThemeProvider.
 */
interface ThemeContextType {
    /** The current time of day. */
    time: TimeOfDay;
    /** The current weather condition. */
    weather: Weather;
    /**
     * Updates the time of day.
     * @param time - The new time of day to set.
     */
    setTime: (time: TimeOfDay) => void;
    /**
     * Updates the weather condition.
     * @param weather - The new weather condition to set.
     */
    setWeather: (weather: Weather) => void;
}

/**
 * Context object for managing global environmental state.
 * initialized as undefined to ensure usage within a Provider.
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Props for the ThemeProvider component.
 */
interface ThemeProviderProps {
    /** The child components that will have access to the theme context. */
    children: ReactNode;
}

/**
 * A provider component that manages the global theme state (Time and Weather).
 * * It synchronizes the state with the DOM by updating data attributes
 * (`data-time` and `data-weather`) on the document root, allowing CSS
 * to handle the visual transitions.
 * * @param props - The provider props.
 * @returns The Context Provider wrapping the children.
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [time, setTime] = useState<TimeOfDay>('morning');
    const [weather, setWeather] = useState<Weather>('clear');

    /**
     * Effect to sync React state with DOM attributes.
     * This enables the CSS Attribute Matrix to function.
     */
    useEffect(() => {
        document.documentElement.setAttribute('data-time', time);
        document.documentElement.setAttribute('data-weather', weather);
    }, [time, weather]);

    return (
        <ThemeContext.Provider value={ { time, weather, setTime, setWeather } }>
            { children }
        </ThemeContext.Provider>
    );
};

/**
 * A custom hook to access the ThemeContext.
 * * @throws {Error} If used outside a ThemeProvider.
 * @returns The current theme state and updater functions.
 */
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
