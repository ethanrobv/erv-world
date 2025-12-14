import { createContext, useContext, useState, type ReactNode } from 'react';

export type WidgetType = 'synth' | 'sequencer' | 'settings';

interface WidgetContextType {
    activeWidgets: WidgetType[];
    openWidget: (widget: WidgetType) => void;
    closeWidget: (widget: WidgetType) => void;
    toggleWidget: (widget: WidgetType) => void;
    isWidgetOpen: (widget: WidgetType) => boolean;
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

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
        <WidgetContext.Provider value={ {
            activeWidgets,
            openWidget,
            closeWidget,
            toggleWidget,
            isWidgetOpen
        } }>
            { children }
        </WidgetContext.Provider>
    );
}

export function useWidgets() {
    const context = useContext(WidgetContext);
    if (!context) {
        throw new Error('useWidgets must be used within a WidgetProvider');
    }
    return context;
}
