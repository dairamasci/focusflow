import { useMemo } from 'react';
import { format, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task } from '@/types';
import { useTaskContext } from '@/context/TaskContext';
import { fromISOString, isToday, formatDuration } from '@/utils/dates';
import { priorityBorderClass } from '@/lib/priority';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The ISO timestamp used to order/group a done task (completedAt, or createdAt as fallback). */
function archiveDate(task: Task): string {
  return task.completedAt ?? task.createdAt;
}

/** Day header label: "Hoy" / "Ayer" / capitalized full Spanish date. */
function dayLabel(iso: string): string {
  const d = fromISOString(iso);
  if (isToday(iso)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  const raw = format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ---------------------------------------------------------------------------
// ArchiveView — all completed tasks, grouped by day (most recent first)
// ---------------------------------------------------------------------------

export default function ArchiveView() {
  const { tasks } = useTaskContext();

  // Group done tasks by calendar day, newest day first, newest task first.
  const groups = useMemo(() => {
    // Both statuses represent completed work: `done` = finished today (still on
    // the board), `archived` = filed away at a previous day close.
    const done = tasks.filter((t) => t.status === 'done' || t.status === 'archived');

    // ISO strings from toISOString() are UTC 'Z' → lexicographic order === chronological.
    const sorted = [...done].sort((a, b) => archiveDate(b).localeCompare(archiveDate(a)));

    // Map preserves insertion order; because `sorted` is descending, the first
    // day inserted is the most recent one.
    const byDay = new Map<string, Task[]>();
    for (const task of sorted) {
      const dayKey = format(fromISOString(archiveDate(task)), 'yyyy-MM-dd');
      const bucket = byDay.get(dayKey);
      if (bucket) bucket.push(task);
      else byDay.set(dayKey, [task]);
    }
    return Array.from(byDay.values());
  }, [tasks]);

  const totalDone = groups.reduce((acc, g) => acc + g.length, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Archivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalDone === 0
            ? 'Tus tareas completadas quedarán guardadas acá.'
            : `${totalDone} ${totalDone === 1 ? 'tarea completada' : 'tareas completadas'} en total.`}
        </p>
      </div>

      {totalDone === 0 ? (
        <p
          data-testid="archive-empty"
          className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
        >
          Todavía no completaste ninguna tarea. Lo que termines aparecerá acá, ordenado por fecha.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const headerIso = archiveDate(group[0]);
            return (
              <section key={headerIso} className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {dayLabel(headerIso)}
                </h2>
                <ul className="space-y-2">
                  {group.map((task) => (
                    <li
                      key={task.id}
                      data-testid="archive-item"
                      className={cn(
                        'flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm',
                        'border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                        priorityBorderClass(task.priority),
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {task.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span className="tabular-nums">
                          {format(fromISOString(archiveDate(task)), 'HH:mm')}
                        </span>
                        <span className="tabular-nums">
                          {formatDuration(task.focusTimeMs ?? 0)} en foco
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
