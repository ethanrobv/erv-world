import { useState, type ReactNode } from 'react';
import { WidgetContext, type WidgetType } from '../context/WidgetContext';

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

    const isWidgetOpen = (widget: WidgetType) => activeWidgets.includes(widget);

    return (
        <WidgetContext.Provider value={{
            activeWidgets,
            openWidget,
            closeWidget,
            toggleWidget,
            isWidgetOpen
        }}>
            {children}
        </WidgetContext.Provider>
    );
}
