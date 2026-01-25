import { type Component, type JSX } from 'solid-js';
import { windowStore, WindowActions } from '../store/window-manager';
import { WindowFrame } from '../../../shared/ui/WindowFrame';

interface WindowProps {
    /** The unique identifier matching the key in windowStore. */
    id: string;
    /** Optional dynamic title override. */
    title?: string;
    children: JSX.Element;
}

/**
 * A DAW specific wrapper around the generic WindowFrame.
 * Connects the component to the DAW's global window store.
 */
export const Window: Component<WindowProps> = (props) => {
    // Access the specific window state from the global DAW store
    const state = () => windowStore[props.id];

    return (
        <WindowFrame
            {...state()}
            title={props.title ?? state().title}
            onClose={() => WindowActions.close(props.id)}
            onTogglePin={() => WindowActions.togglePin(props.id)}
            onFocus={() => WindowActions.focus(props.id)}
            onMove={(x, y) => WindowActions.move(props.id, x, y)}
            onResize={(w, h) => WindowActions.resize(props.id, w, h)}
        >
            {props.children}
        </WindowFrame>
    );
};
