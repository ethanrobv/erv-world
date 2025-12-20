import { useState, useMemo, type ReactNode } from 'react';
import { WidgetContext, type WidgetType } from '../context/WidgetContext';

export function WidgetProvider({ children }: { children: ReactNode }) {
    /* -------------------------------------------------------------------------- */
    /* STATE                                                                      */
    /* -------------------------------------------------------------------------- */

    const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);

    /* -------------------------------------------------------------------------- */
    /* ACTIONS                                                                    */
    /* -------------------------------------------------------------------------- */

    const openWidget = (widget: WidgetType) => {
        setActiveWidgets((prev) => {
            if (prev.includes(widget)) return prev;
            return [...prev, widget];
        });
    };

    const closeWidget = (widget: WidgetType) => {
        setActiveWidgets((prev) => prev.filter((w) => w !== widget));
    };

    const toggleWidget = (widget: WidgetType) => {
        setActiveWidgets((prev) => {
            if (prev.includes(widget)) {
                return prev.filter((w) => w !== widget);
            }
            return [...prev, widget];
        });
    };

    const bringToFront = (widget: WidgetType) => {
        setActiveWidgets((prev) => {
            if (!prev.includes(widget)) return prev;
            // Filter out, then append to end (highest z-index effectively)
            const others = prev.filter((w) => w !== widget);
            return [...others, widget];
        });
    };

    /* -------------------------------------------------------------------------- */
    /* HELPERS                                                                    */
    /* -------------------------------------------------------------------------- */

    const isWidgetOpen = (widget: WidgetType) => activeWidgets.includes(widget);

    /* -------------------------------------------------------------------------- */
    /* PROVIDER RENDER                                                            */
    /* -------------------------------------------------------------------------- */

    // Memoize value to prevent unnecessary re-renders in consumers
    const contextValue = useMemo(() => ({
        activeWidgets,
        bringToFront,
        openWidget,
        closeWidget,
        toggleWidget,
        isWidgetOpen
    }), [activeWidgets]);

    return (
        <WidgetContext.Provider value={ contextValue }>
            { children }
        </WidgetContext.Provider>
    );
}
