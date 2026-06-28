import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { Task, Priority, TaskStatus, TaskAction } from '@/types';
import { generateId } from '@/utils/ids';
import { toISOString, getTodayKey } from '@/utils/dates';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Pure reducer for task state — with one documented exception.
 *
 * Design note on ADD_TASK + generateId:
 *   The shared `TaskAction` type (fixed in types/index.ts) only carries
 *   `{ name, createdAt }` in the ADD_TASK payload — there is no room for a
 *   pre-generated id. To avoid modifying the shared contract, we call
 *   `generateId()` here inside the reducer. This means ADD_TASK is not
 *   strictly referentially transparent (two calls with the same arguments
 *   produce different ids), but all other actions remain pure. The trade-off
 *   was accepted by the project orchestrator as the pragmatic Opción 2.
 */
function taskReducer(state: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case 'ADD_TASK':
      // id generated here — see design note above.
      return [
        ...state,
        {
          id: generateId(),
          name: action.payload.name.trim(),
          priority: null,
          status: 'inbox',
          createdAt: action.payload.createdAt,
        },
      ];

    case 'UPDATE_PRIORITY':
      return state.map((t) =>
        t.id === action.payload.id ? { ...t, priority: action.payload.priority } : t,
      );

    case 'UPDATE_STATUS':
      // movedToBoardAt is intentionally NOT set here: UPDATE_STATUS carries no
      // timestamp and calling new Date() would break reducer purity. Callers
      // that need to track movedToBoardAt may do so via a future action
      // extension. For now UPDATE_STATUS only changes the status field.
      return state.map((t) =>
        t.id === action.payload.id ? { ...t, status: action.payload.status } : t,
      );

    case 'DELETE_TASK':
      return state.filter((t) => t.id !== action.payload.id);

    case 'COMPLETE_TASK':
      return state.map((t) => {
        if (t.id !== action.payload.id) return t;
        return {
          ...t,
          status: 'done',
          completedAt: action.payload.completedAt,
          // Accumulate focus time if the session reported one.
          focusTimeMs:
            action.payload.focusTimeMs !== undefined
              ? (t.focusTimeMs ?? 0) + action.payload.focusTimeMs
              : t.focusTimeMs,
        };
      });

    case 'ROLLOVER_TASKS':
      // Semantic: ALL non-completed tasks return to inbox regardless of when
      // they were created or moved. "Close day" means the user is done for
      // this session; next session everything should appear fresh in inbox for
      // re-triage. Priority is preserved so re-triaging is quick.
      // payload.todayKey is available for future date-aware filtering but is
      // not used here by design (the rule is simply status !== 'done' → inbox).
      return state.map((t) =>
        t.status !== 'done'
          ? { ...t, status: 'inbox', movedToBoardAt: undefined }
          : t,
      );

    case 'ADD_FOCUS_TIME':
      // Accumulate partial focus time without changing status or completedAt.
      return state.map((t) =>
        t.id === action.payload.id
          ? { ...t, focusTimeMs: (t.focusTimeMs ?? 0) + action.payload.focusTimeMs }
          : t,
      );

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

type TaskContextValue = {
  tasks: Task[];
  dispatch: (action: TaskAction) => void;
  /** Capture a new task into the inbox. */
  addTask: (name: string) => void;
  /** Change the priority of a task. */
  setPriority: (id: string, priority: Priority) => void;
  /** Move a task to a different status stage. */
  setStatus: (id: string, status: TaskStatus) => void;
  /** Permanently remove a task. */
  deleteTask: (id: string) => void;
  /** Mark a task as done, optionally recording focus time from the session. */
  completeTask: (id: string, focusTimeMs?: number) => void;
  /** Move all non-completed tasks back to inbox (end-of-day rollover). */
  rolloverTasks: () => void;
  /** Accumulate partial focus time on a task without marking it done — used on abandon. */
  addFocusTime: (id: string, focusTimeMs: number) => void;
};

const TaskContext = createContext<TaskContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'focusflow:tasks';

export function TaskProvider({ children }: { children: ReactNode }) {
  // useReducer is the single source of truth. The lazy initializer reads from
  // localStorage once at mount; subsequent changes are synced via useEffect.
  const [tasks, dispatch] = useReducer(
    taskReducer,
    [] as Task[],
    (initial: Task[]): Task[] => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) return initial;
        return JSON.parse(stored) as Task[];
      } catch {
        return initial;
      }
    },
  );

  // One-way sync: persist tasks to localStorage whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      console.warn('[TaskProvider] Failed to persist tasks to localStorage.');
    }
  }, [tasks]);

  // ------ Action-creators (keep components free of dispatch details) ------

  function addTask(name: string): void {
    dispatch({
      type: 'ADD_TASK',
      payload: { name, createdAt: toISOString(new Date()) },
    });
  }

  function setPriority(id: string, priority: Priority): void {
    dispatch({ type: 'UPDATE_PRIORITY', payload: { id, priority } });
  }

  function setStatus(id: string, status: TaskStatus): void {
    dispatch({ type: 'UPDATE_STATUS', payload: { id, status } });
  }

  function deleteTask(id: string): void {
    dispatch({ type: 'DELETE_TASK', payload: { id } });
  }

  function completeTask(id: string, focusTimeMs?: number): void {
    dispatch({
      type: 'COMPLETE_TASK',
      payload: { id, completedAt: toISOString(new Date()), focusTimeMs },
    });
  }

  function rolloverTasks(): void {
    dispatch({ type: 'ROLLOVER_TASKS', payload: { todayKey: getTodayKey() } });
  }

  function addFocusTime(id: string, focusTimeMs: number): void {
    dispatch({ type: 'ADD_FOCUS_TIME', payload: { id, focusTimeMs } });
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        dispatch,
        addTask,
        setPriority,
        setStatus,
        deleteTask,
        completeTask,
        rolloverTasks,
        addFocusTime,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Read the TaskContext. Must be called inside a <TaskProvider>. */
export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (ctx === null) {
    throw new Error('useTaskContext must be used within a <TaskProvider>.');
  }
  return ctx;
}
