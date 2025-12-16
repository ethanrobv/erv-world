import { useState, useEffect } from 'react';

export function useThemeColor(variableName: string) {
    // Helper to read the value from :root
    const getColor = () => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    };

    const [color, setColor] = useState(getColor);

    useEffect(() => {
        // Update immediately on mount in case it changed
        setColor(getColor());

        // Watch the <html> tag for attribute changes (specifically data-theme)
        const observer = new MutationObserver(() => {
            setColor(getColor());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        return () => observer.disconnect();
    }, [variableName]);

    return color;
}
