import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// State & actions (local — not part of the shared types/index.ts contract)
// ---------------------------------------------------------------------------

type FocusState = {
  activeTaskId: string | null;
  elapsedMs: number;
  isRunning: boolean;
};

/**
 * FocusAction is defined locally because these actions drive an internal
 * timer/chronometer mechanism that is intentionally decoupled from the domain
 * task model (TaskAction / TaskContext).
 *
 * Auxiliary actions added beyond the PLAN spec:
 *  - TICK       — dispatched by the setInterval every 1 s; advances elapsedMs.
 *  - RESUME_FOCUS — re-starts the timer after a PAUSE without resetting elapsedMs.
 *
 * FocusContext owns ONLY the chronometer. Callers (views) are responsible for
 * reading elapsedMs here and dispatching completeTask() via TaskContext when
 * they want to record the session time on the task record.
 */
type FocusAction =
  | { type: 'START_FOCUS'; payload: { taskId: string } }
  | { type: 'PAUSE_FOCUS' }
  | { type: 'RESUME_FOCUS' }
  | { type: 'TICK'; payload: { deltaMs: number } }
  | { type: 'COMPLETE_FOCUS' }
  | { type: 'ABANDON_FOCUS' };

const INITIAL_STATE: FocusState = {
  activeTaskId: null,
  elapsedMs: 0,
  isRunning: false,
};

function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case 'START_FOCUS':
      return { activeTaskId: action.payload.taskId, elapsedMs: 0, isRunning: true };
    case 'PAUSE_FOCUS':
      return { ...state, isRunning: false };
    case 'RESUME_FOCUS':
      return { ...state, isRunning: true };
    case 'TICK':
      return { ...state, elapsedMs: state.elapsedMs + action.payload.deltaMs };
    case 'COMPLETE_FOCUS':
    case 'ABANDON_FOCUS':
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

type FocusContextValue = {
  activeTaskId: string | null;
  elapsedMs: number;
  isRunning: boolean;
  startFocus: (taskId: string) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  completeFocus: () => void;
  abandonFocus: () => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(focusReducer, INITIAL_STATE);

  // Holds the interval id so we can clear it on pause/unmount.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer management: start/stop setInterval based on isRunning.
  //
  // Timer strategy: fixed 1 000 ms tick (simpler to reason about than
  // delta-timestamp logic; sufficient accuracy for a focus timer). The
  // interval is always cleared in the cleanup function to prevent leaks
  // and double-ticking under React StrictMode (StrictMode mounts twice in
  // dev; cleanup ensures the stale interval is cancelled before the new one
  // starts).
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK', payload: { deltaMs: 1000 } });
      }, 1000);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning]);

  // ------ Action-creators ------

  function startFocus(taskId: string): void {
    dispatch({ type: 'START_FOCUS', payload: { taskId } });
  }

  function pauseFocus(): void {
    dispatch({ type: 'PAUSE_FOCUS' });
  }

  function resumeFocus(): void {
    dispatch({ type: 'RESUME_FOCUS' });
  }

  function completeFocus(): void {
    dispatch({ type: 'COMPLETE_FOCUS' });
  }

  function abandonFocus(): void {
    dispatch({ type: 'ABANDON_FOCUS' });
  }

  return (
    <FocusContext.Provider
      value={{
        activeTaskId: state.activeTaskId,
        elapsedMs: state.elapsedMs,
        isRunning: state.isRunning,
        startFocus,
        pauseFocus,
        resumeFocus,
        completeFocus,
        abandonFocus,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Read the FocusContext. Must be called inside a <FocusProvider>. */
export function useFocusContext(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (ctx === null) {
    throw new Error('useFocusContext must be used within a <FocusProvider>.');
  }
  return ctx;
}
