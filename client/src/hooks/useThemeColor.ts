import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook that tracks the computed value of a CSS variable (design token).
 * It synchronizes with theme changes by observing attributes on the document element.
 *
 * @param variableName - The CSS variable to track (e.g., '--primary-color').
 * @returns The current computed string value of the CSS variable.
 */
export function useThemeColor(variableName: string): string {
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

    const [color, setColor] = useState<string>(getColor);

    useEffect(() => {
        // Init
        setColor(getColor());

        // Observer Setup
        // Watches the <html> element for changes to 'data-theme' or 'class'.
        const observer = new MutationObserver(() => {
            setColor(getColor());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme', 'class'],
        });

        // Media Query / Resize Listener
        // CSS variables often change values inside @media (prefers-color-scheme: dark)
        const handleResize = () => setColor(getColor());
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [variableName, getColor]);

    return color;
}
