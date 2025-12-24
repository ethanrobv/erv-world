import { useState, useMemo, type ReactNode } from 'react';
import { WidgetContext, type WidgetType } from '../context/WidgetContext';

/**
 * Manages the state and stacking order of floating UI widgets.
 *
 * This provider handles:
 * 1. Visibility (Open/Close/Toggle) of widgets.
 * 2. Z-Index Management (via `bringToFront`), ensuring the most recently interacted widget
 * is rendered last (on top) in the DOM order.
 */
export function WidgetProvider({ children }: { children: ReactNode }) {
    const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);

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

    /**
     * Moves the specified widget to the end of the active list.
     * In the rendering loop, the last element is rendered on top of others.
     */
    const bringToFront = (widget: WidgetType) => {
        setActiveWidgets((prev) => {
            if (!prev.includes(widget)) return prev;
            // Filter out the widget, then append it to the end
            const others = prev.filter((w) => w !== widget);
            return [...others, widget];
        });
    };

    const isWidgetOpen = (widget: WidgetType) => activeWidgets.includes(widget);

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
