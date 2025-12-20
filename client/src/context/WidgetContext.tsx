import { createContext, useContext } from 'react';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * specific identifiers for available widgets.
 */
export type WidgetType = 'synth' | 'game' | 'settings';

/**
 * Defines the shape of the Widget Context.
 * Manages the visibility and z-index (stacking order) of widgets.
 */
export interface WidgetContextType {
    /** An ordered list of currently open widgets. The last item is the top-most widget. */
    activeWidgets: WidgetType[];
    /** Moves a specific widget to the top of the stack (end of the array). */
    bringToFront: (widget: WidgetType) => void;
    /** Opens a widget and brings it to the front. */
    openWidget: (widget: WidgetType) => void;
    /** Closes a specific widget and removes it from the stack. */
    closeWidget: (widget: WidgetType) => void;
    /** Toggles the open/closed state of a widget. */
    toggleWidget: (widget: WidgetType) => void;
    /** Checks if a specific widget is currently open. */
    isWidgetOpen: (widget: WidgetType) => boolean;
}

/* -------------------------------------------------------------------------- */
/* CONTEXT DEFINITION                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Context for managing window/widget state across the desktop environment.
 */
export const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/* CUSTOM HOOKS                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Custom hook to access widget state and control methods.
 *
 * @throws {Error} If used outside of a <WidgetProvider>.
 * @returns {WidgetContextType} The widget context API.
 */
export function useWidgets(): WidgetContextType {
    const context = useContext(WidgetContext);

    if (!context) {
        throw new Error('useWidgets must be used within a WidgetProvider');
    }

    return context;
}
