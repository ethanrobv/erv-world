import { createContext, useContext } from 'react';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type WidgetType = 'synth' | 'game' | 'settings';

interface WidgetContextType {
    activeWidgets: WidgetType[];
    bringToFront: (widget: WidgetType) => void;
    openWidget: (widget: WidgetType) => void;
    closeWidget: (widget: WidgetType) => void;
    toggleWidget: (widget: WidgetType) => void;
    isWidgetOpen: (widget: WidgetType) => boolean;
}

/* -------------------------------------------------------------------------- */
/* CONTEXT DEFINITION                                                         */
/* -------------------------------------------------------------------------- */

export const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/* CUSTOM HOOKS                                                               */

/* -------------------------------------------------------------------------- */

export function useWidgets() {
    const context = useContext(WidgetContext);
    if (!context) {
        throw new Error('useWidgets must be used within a WidgetProvider');
    }
    return context;
}
