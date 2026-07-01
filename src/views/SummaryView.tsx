import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Sparkles, Timer, PartyPopper, type LucideIcon } from 'lucide-react';
import type { DailyStats } from '@/types';
import { useTaskContext } from '@/context/TaskContext';
import { isToday, getTodayKey, formatDuration } from '@/utils/dates';
import { celebrate } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Stat card — internal presentational component
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  testId: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tint + soft background. */
  accent: string;
}

function StatCard({ label, value, testId, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', accent)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          data-testid={testId}
          className="text-2xl font-bold tracking-tight text-foreground tabular-nums"
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryView
// ---------------------------------------------------------------------------

const DAILY_STATS_KEY = 'focusflow:dailyStats';

export default function SummaryView() {
  const { tasks, rolloverTasks } = useTaskContext();
  const navigate = useNavigate();

  // ---- Derived metrics ----

  const { completedToday, completedCount, newTasksCount, totalFocusMs } =
    useMemo(() => {
      // Count everything completed today, whether still `done` on the board or
      // already `archived` by an earlier "Cerrar el día" on the same day — so the
      // day's metrics stay stable across a close.
      const completed = tasks.filter(
        (t) =>
          (t.status === 'done' || t.status === 'archived') &&
          t.completedAt !== undefined &&
          isToday(t.completedAt),
      );

      return {
        completedToday: completed,
        completedCount: completed.length,
        newTasksCount: tasks.filter((t) => isToday(t.createdAt)).length,
        totalFocusMs: completed.reduce((acc, t) => acc + (t.focusTimeMs ?? 0), 0),
      };
    }, [tasks]);

  // ---- Header date ----

  const todayLabel = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  // ---- "Cerrar el día" handler ----

  function handleCloseDay() {
    const todayKey = getTodayKey();

    // 1. Build the DailyStats record for today.
    const stats: DailyStats = {
      date: todayKey,
      completedCount,
      newTasksCount,
      totalFocusMs,
    };

    // 2. Merge into the existing map in localStorage (preserve other days).
    try {
      const raw = localStorage.getItem(DAILY_STATS_KEY);
      const map: Record<string, DailyStats> = raw !== null ? (JSON.parse(raw) as Record<string, DailyStats>) : {};
      map[todayKey] = stats;
      localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(map));
    } catch {
      // If parsing fails, write a fresh map rather than losing today's data.
      const fresh: Record<string, DailyStats> = { [todayKey]: stats };
      try {
        localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(fresh));
      } catch {
        console.warn('[SummaryView] Failed to persist DailyStats to localStorage.');
      }
    }

    // 3. Move all non-completed tasks back to inbox (done → archived).
    rolloverTasks();

    // 4. Celebrate the close, then navigate home once the confetti is on screen.
    celebrate();
    window.setTimeout(() => navigate('/inbox'), 900);
  }

  // ---- Render ----

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumen del día</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{todayLabel}</p>
        </div>

        <Button
          data-testid="close-day"
          onClick={handleCloseDay}
          size="default"
          className="shrink-0 gap-2 bg-emerald-600 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <PartyPopper className="h-4 w-4" />
          Cerrar el día
        </Button>
      </div>

      {/* Stat cards — 3 columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Tareas completadas"
          value={String(completedCount)}
          testId="stat-completed"
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Tareas que surgieron"
          value={String(newTasksCount)}
          testId="stat-new"
          icon={Sparkles}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Tiempo total en foco"
          value={formatDuration(totalFocusMs)}
          testId="stat-focus"
          icon={Timer}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Completed tasks list / empty state */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Completadas hoy
        </h2>

        {completedToday.length === 0 ? (
          <p
            data-testid="summary-empty"
            className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
          >
            Todavía no completaste tareas hoy. ¡A enfocarse!
          </p>
        ) : (
          <ul className="space-y-2">
            {completedToday.map((task) => (
              <li
                key={task.id}
                data-testid="completed-item"
                className="flex items-center justify-between gap-4 rounded-lg border border-l-4 border-border border-l-emerald-500 bg-card px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {task.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDuration(task.focusTimeMs ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
