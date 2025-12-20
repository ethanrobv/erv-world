import { useState, useEffect, useCallback } from 'react';

/* -------------------------------------------------------------------------- */
/* HOOK DEFINITION                                                            */

/* -------------------------------------------------------------------------- */

/**
 * A custom hook that tracks the computed value of a CSS variable (design token).
 * It synchronizes with theme changes by observing attributes on the document element.
 * * @param variableName - The CSS variable to track (e.g., '--primary-color').
 * @returns The current computed string value of the CSS variable.
 */
export function useThemeColor(variableName: string): string {
    /* -------------------------------------------------------------------------- */
    /* HELPER FUNCTIONS                                                           */
    /* -------------------------------------------------------------------------- */

    /**
     * Reads the current computed value of the provided CSS variable from :root.
     */
    const getColor = useCallback((): string => {
        if (typeof window === 'undefined') return '#ffffff';

        // getComputedStyle is live, but we trim to remove whitespace from CSS definitions
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(variableName)
            .trim();

        return value || '#ffffff';
    }, [variableName]);

    /* -------------------------------------------------------------------------- */
    /* STATE & LIFECYCLE                                                          */
    /* -------------------------------------------------------------------------- */

    const [color, setColor] = useState<string>(getColor);

    useEffect(() => {
        // 1. Initial Update
        // Ensures the state is correct after the component mounts (critical for SSR/Hydration)
        setColor(getColor());

        // 2. Observer Setup
        // Watches the <html> element for changes to 'data-theme' or 'class'.
        // This allows the hook to react when a theme-switch function toggles a global class.
        const observer = new MutationObserver(() => {
            setColor(getColor());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme', 'class'], // Added 'class' as it's a common theme toggle target
        });

        // 3. Media Query / Resize Listener
        // CSS variables often change values inside @media (prefers-color-scheme: dark)
        // or responsive breakpoints.
        const handleResize = () => setColor(getColor());
        window.addEventListener('resize', handleResize);

        // 4. Cleanup
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [variableName, getColor]);

    return color;
}
