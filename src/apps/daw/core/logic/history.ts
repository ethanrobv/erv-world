import { createSignal } from 'solid-js';

/**
 * Represents a reversible action in the application.
 */
export interface Command {
    /** The human-readable name of the action (e.g., "Add Track", "Change Volume"). */
    name: string;
    /** The function to execute to reverse the action. */
    undo: () => void;
    /** The function to execute to re-apply the action. */
    redo: () => void;
}

/**
 * Manages the Undo/Redo stacks and atomic transaction grouping.
 *
 * This singleton handles:
 * 1. Simple instantaneous commands.
 * 2. Continuous transactions (e.g., dragging a knob) grouped into single history entries.
 * 3. Reactive state for UI updates.
 */
class HistoryManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    // Reactive signals exposed to the UI
    private _canUndo = createSignal(false);
    private _canRedo = createSignal(false);

    // Transaction State
    private isTransactionActive = false;
    private currentTransactionName = '';
    // The state-restore function captured at the start of the transaction
    private transactionUndoFn: (() => void) | null = null;

    /**
     * Returns the read-only signal accessor for undo availability.
     * Usage: `history.canUndo()` in a component.
     */
    get canUndo() {
        return this._canUndo[0];
    }

    /**
     * Returns the read-only signal accessor for redo availability.
     * Usage: `history.canRedo()` in a component.
     */
    get canRedo() {
        return this._canRedo[0];
    }

    /**
     * Executes a command immediately (or assumes it has just executed) and pushes it to history.
     * Clears the redo stack.
     *
     * @param cmd - The command object containing name, undo, and redo logic.
     */
    push(cmd: Command) {
        if (this.isTransactionActive) return;

        this.undoStack.push(cmd);
        this.redoStack = [];
        this.updateSignals();

        if (this.undoStack.length > 100) {
            this.undoStack.shift();
        }
    }

    /**
     * Starts a grouping of updates (e.g., dragging a slider).
     * Call this on `mousedown`.
     *
     * @param name - The display name for the action (e.g., "Change Volume").
     * @param captureUndo - A function that restores state to BEFORE the transaction started.
     */
    beginTransaction(name: string, captureUndo: () => void) {
        if (this.isTransactionActive) return; // Prevent nested transactions
        this.isTransactionActive = true;
        this.currentTransactionName = name;
        this.transactionUndoFn = captureUndo;
    }

    /**
     * Finalizes the transaction and pushes a single command to history.
     * Call this on `mouseup`.
     *
     * @param captureRedo - A function that restores state to the CURRENT value (after drag).
     */
    commitTransaction(captureRedo: () => void) {
        if (!this.isTransactionActive || !this.transactionUndoFn) {
            this.isTransactionActive = false;
            return;
        }

        const cmd: Command = {
            name: this.currentTransactionName,
            undo: this.transactionUndoFn,
            redo: captureRedo,
        };

        this.undoStack.push(cmd);
        this.redoStack = [];
        this.isTransactionActive = false;
        this.transactionUndoFn = null;
        this.updateSignals();
    }

    /**
     * Cancels the current transaction without adding to history.
     * Useful if the user presses Escape while dragging to revert changes.
     */
    cancelTransaction() {
        if (this.isTransactionActive && this.transactionUndoFn) {
            // Revert state to beginning of transaction
            this.transactionUndoFn();
        }
        this.isTransactionActive = false;
        this.transactionUndoFn = null;
    }

    /**
     * Performs the Undo operation.
     */
    undo() {
        if (this.isTransactionActive) return; // Cannot undo while dragging

        const cmd = this.undoStack.pop();
        if (!cmd) return;

        console.log(`[History] Undo: ${cmd.name}`);
        cmd.undo();
        this.redoStack.push(cmd);
        this.updateSignals();
    }

    /**
     * Performs the Redo operation.
     */
    redo() {
        if (this.isTransactionActive) return;

        const cmd = this.redoStack.pop();
        if (!cmd) return;

        console.log(`[History] Redo: ${cmd.name}`);
        cmd.redo();
        this.undoStack.push(cmd);
        this.updateSignals();
    }

    /**
     * Internal helper to update the reactive signals.
     */
    private updateSignals() {
        const setCanUndo = this._canUndo[1];
        const setCanRedo = this._canRedo[1];
        setCanUndo(this.undoStack.length > 0);
        setCanRedo(this.redoStack.length > 0);
    }
}

export const history = new HistoryManager();

/**
 * Registers global keyboard shortcuts for Undo/Redo.
 */
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        // Ignore key events if the user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const isCtrlOrCmd = e.ctrlKey || e.metaKey;

        if (isCtrlOrCmd) {
            const key = e.key.toLowerCase();

            // TODO: unify global hotkeys
            // Redo: Ctrl+Shift+Z or Ctrl+Y
            if ((e.shiftKey && key === 'z') || key === 'y') {
                e.preventDefault();
                history.redo();
                return;
            }

            // Undo: Ctrl+Z
            if (key === 'z') {
                e.preventDefault();
                history.undo();
                return;
            }
        }
    });
}
