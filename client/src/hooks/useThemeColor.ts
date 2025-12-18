import { useState, useEffect } from 'react';

export function useThemeColor(variableName: string) {
    /* -------------------------------------------------------------------------- */
    /* HELPER FUNCTIONS                                                           */
    /* -------------------------------------------------------------------------- */

    // Helper to read the CSS variable value from :root
    const getColor = () => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    };

    /* -------------------------------------------------------------------------- */
    /* STATE & LIFECYCLE                                                          */
    /* -------------------------------------------------------------------------- */

    const [color, setColor] = useState(getColor);

    useEffect(() => {
        // 1. Initial Update (in case of SSR hydration mismatch or fast changes)
        setColor(getColor());

        // 2. Observer Setup (Watch <html> for 'data-theme' attribute changes)
        const observer = new MutationObserver(() => {
            setColor(getColor());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        // 3. Cleanup
        return () => observer.disconnect();
    }, [variableName]);

    return color;
}
