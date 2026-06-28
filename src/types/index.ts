/**
 * FocusFlow — central type definitions.
 *
 * Task lifecycle: inbox → todo (board) → in_progress (focus) → done
 * All dates are ISO 8601 strings; never use Date objects in state/types.
 */

// ---------------------------------------------------------------------------
// Primitive unions
// ---------------------------------------------------------------------------

/** Urgency level of a task. `null` means not yet triaged. */
export type Priority = 'urgent' | 'normal' | 'low' | null;

/**
 * Where a task lives in the workflow:
 *  - `inbox`       — just captured, not yet committed to the board
 *  - `todo`        — on the board, queued for work
 *  - `in_progress` — currently being focused on
 *  - `done`        — completed
 */
export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'done';

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

/**
 * A single task managed by FocusFlow.
 * Created in the inbox and progresses through the lifecycle above.
 */
export interface Task {
  /** UUID v4 — stable identifier for the lifetime of the task. */
  id: string;
  /** Human-readable task name entered by the user. */
  name: string;
  priority: Priority;
  status: TaskStatus;
  /** ISO string — when the task was first created. */
  createdAt: string;
  /** ISO string — when the task was moved from inbox onto the board (todo). */
  movedToBoardAt?: string;
  /** ISO string — when the task reached `done` status. */
  completedAt?: string;
  /** Accumulated focus time in milliseconds across all sessions for this task. */
  focusTimeMs?: number;
}

/**
 * A single focus session attached to one task.
 * Multiple sessions can exist per task (e.g. if focus is paused and resumed).
 */
export interface FocusSession {
  taskId: string;
  /** ISO string — when this session started. */
  startedAt: string;
  /** Duration of this session in milliseconds. */
  elapsedMs: number;
}

/**
 * Aggregated stats for a single calendar day, keyed by date string (e.g. "2026-06-28").
 * Used to render the daily summary / history view.
 */
export interface DailyStats {
  /** Date key in "YYYY-MM-DD" format. */
  date: string;
  /** Number of tasks completed on this day. */
  completedCount: number;
  /** Number of new tasks captured on this day. */
  newTasksCount: number;
  /** Total milliseconds spent in focus mode on this day. */
  totalFocusMs: number;
}

// ---------------------------------------------------------------------------
// Reducer actions (discriminated union)
// ---------------------------------------------------------------------------

/**
 * All possible actions dispatched to the task reducer (TaskContext).
 *
 * Naming convention: screaming-snake describes WHAT happened, not HOW.
 * Reducers must be pure — no `new Date()` calls inside; callers supply ISO strings.
 */
export type TaskAction =
  /** Capture a new task into the inbox. `createdAt` is supplied by the caller. */
  | { type: 'ADD_TASK'; payload: { name: string; createdAt: string } }

  /** Change the priority of an existing task. */
  | { type: 'UPDATE_PRIORITY'; payload: { id: string; priority: Priority } }

  /** Move a task to a different status stage. */
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: TaskStatus } }

  /** Permanently remove a task from state. */
  | { type: 'DELETE_TASK'; payload: { id: string } }

  /**
   * Mark a task as done. Sets `status = 'done'` and records `completedAt`.
   * Optionally accumulates `focusTimeMs` from the just-ended session.
   * `completedAt` is supplied by the caller (ISO string) to keep the reducer pure.
   */
  | { type: 'COMPLETE_TASK'; payload: { id: string; completedAt: string; focusTimeMs?: number } }

  /**
   * Rollover: move every non-completed task from previous days back to `inbox`.
   * `todayKey` is a "YYYY-MM-DD" string supplied by the caller so the reducer
   * can compare dates without ever calling `new Date()` internally.
   */
  | { type: 'ROLLOVER_TASKS'; payload: { todayKey: string } };
