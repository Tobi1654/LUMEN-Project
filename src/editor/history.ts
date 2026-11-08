export interface HistoryState<T>{
    past: T[];
    present: T];
    future: T[];
}

//create history
export function createHistory<T>(initial: T): HistoryState<T> {
    return{
        past: [],
        present: initial,
        future: []
    };
}

//this function saves a new state
export function pushHistory<T>(
    history: HistoryState<T>,
    newState: T
): HistoryState<T>{
    return{
        past: [...history.past, history.present].slice(-100),
        present: newState,
        future: [],
    };
}

//undo function
export function undo<T>(
    history: HistoryState<T>
): HistoryState<T> {
    if (history.past.length === 0) {
    return history;
    }

    const previous = history.past[history.past.length - 1];

    return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    };
}

//redo function
export function redo<T>(
    history: HistoryState<T>
): HistoryState<T> {
    if (history.future.length === 0) {
    return history;
    }

    const next = history.future[0];

    return {
    past: [...history.past, history.present].slice(-100),
    present: next,
    future: history.future.slice(1),
    };
}

//checks if undo is available
export function canUndo<T>(history: HistoryState<T>): boolean {
    return history.past.length > 0;
}

//checks whether redo is available
export function canRedo<T>(history: HistoryState<T>): boolean {
    return history.future.length > 0;
}