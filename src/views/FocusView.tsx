import { useEffect } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { useFocusContext } from '@/context/FocusContext';
import { priorityBorderClass } from '@/lib/priority';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Task } from '@/types';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Format elapsed milliseconds as mm:ss.
 * Minutes are unbounded (supports >59 min, e.g. 4 500 000 ms → "75:00").
 * Examples: 0 → "00:00", 125 000 → "02:05", 4 500 000 → "75:00".
 */
function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function FocusView() {
  const {
    activeTaskId,
    elapsedMs,
    isRunning,
    startFocus,
    pauseFocus,
    resumeFocus,
    completeFocus,
    abandonFocus,
  } = useFocusContext();

  const { tasks, setStatus, completeTask, addFocusTime } = useTaskContext();

  // Task candidates: todo or in_progress
  const candidates: Task[] = tasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );

  // Resolve the currently active task (null when no focus session is active).
  const activeTask: Task | null =
    activeTaskId !== null ? (tasks.find((t) => t.id === activeTaskId) ?? null) : null;

  // Defensive guard: if a focus session is active but the task was deleted,
  // abandon the session so the UI falls back to the selector.
  // `abandonFocus` is intentionally omitted from deps — it is recreated each
  // render but semantically stable; the guard only needs to react to the
  // presence/absence of activeTaskId and the resolved task.
  useEffect(() => {
    if (activeTaskId !== null && activeTask === null) {
      abandonFocus();
    }
  }, [activeTaskId, activeTask]);

  // Render nothing while the guard dispatches and React re-renders.
  if (activeTaskId !== null && activeTask === null) {
    return null;
  }

  // ── Focus mode ────────────────────────────────────────────────────────────
  if (activeTaskId !== null && activeTask !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        {/* Active task name */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Enfocado en
          </p>
          <h2 className="text-2xl font-semibold">{activeTask.name}</h2>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'text-6xl font-mono tabular-nums font-bold tracking-tighter transition-colors duration-500',
              isRunning ? 'text-foreground' : 'text-muted-foreground',
            )}
            data-testid="focus-timer"
          >
            {formatTimer(elapsedMs)}
          </div>

          {/* Live status pill with a pulsing dot */}
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
              isRunning
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isRunning ? 'animate-pulse bg-emerald-500' : 'bg-amber-500',
              )}
            />
            {isRunning ? 'En curso' : 'En pausa'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3">
          {/* Pause / Resume */}
          <Button
            variant="outline"
            data-testid="focus-toggle"
            onClick={isRunning ? pauseFocus : resumeFocus}
          >
            {isRunning ? 'Pausar' : 'Reanudar'}
          </Button>

          {/* Complete: accumulate time + mark done */}
          <Button
            data-testid="focus-complete"
            onClick={() => {
              completeTask(activeTaskId, elapsedMs);
              completeFocus();
            }}
          >
            Completar
          </Button>

          {/* Abandon: accumulate partial time (if any) without marking done */}
          <Button
            variant="destructive"
            data-testid="focus-abandon"
            onClick={() => {
              if (elapsedMs > 0) {
                addFocusTime(activeTaskId, elapsedMs);
              }
              abandonFocus();
            }}
          >
            Abandonar
          </Button>
        </div>
      </div>
    );
  }

  // ── Selector mode ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Modo foco</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleccioná una tarea para iniciar una sesión de trabajo concentrado.
        </p>
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No hay tareas para enfocar. Mové tareas al tablero primero.
        </p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((task) => (
            <li key={task.id}>
              <button
                data-testid="focus-candidate"
                onClick={() => {
                  startFocus(task.id);
                  setStatus(task.id, 'in_progress');
                }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border border-border border-l-4 bg-card shadow-sm',
                  'hover:bg-accent transition-colors cursor-pointer',
                  priorityBorderClass(task.priority),
                )}
              >
                <span className="font-medium">{task.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
