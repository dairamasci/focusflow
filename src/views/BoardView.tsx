/**
 * BoardView — Kanban board with three columns and HTML5 native drag & drop.
 *
 * Columns: "Por hacer" (todo) | "En progreso" (in_progress) | "Hecho" (done)
 *
 * Drag & drop flow:
 *   - onDragStart on each card: stores task.id via dataTransfer.setData('text/plain', id)
 *   - onDragOver on each column: e.preventDefault() to allow drop + sets dragOverColumn highlight
 *   - onDrop on each column: reads id via getData, dispatches setStatus or completeTask
 *
 * onDragLeave strategy:
 *   We check e.currentTarget.contains(e.relatedTarget) before clearing dragOverColumn.
 *   This avoids the common "child-enter flicker" where dragging over a card inside
 *   the column incorrectly triggers the column's dragLeave event.
 */

import { useState, useMemo } from 'react';
import type { Task, TaskStatus } from '@/types';
import { useTaskContext } from '@/context/TaskContext';
import { formatRelative } from '@/utils/dates';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  priorityBorderClass,
  priorityLabel,
  priorityBadgeClass,
} from '@/lib/priority';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The three statuses that live on the board (excludes 'inbox'). */
type BoardStatus = Exclude<TaskStatus, 'inbox'>;

interface ColumnConfig {
  status: BoardStatus;
  title: string;
  testId: string;
  countTestId: string;
}

// ---------------------------------------------------------------------------
// Column configuration — single source of truth for labels / testIds
// ---------------------------------------------------------------------------

const COLUMNS: ColumnConfig[] = [
  {
    status: 'todo',
    title: 'Por hacer',
    testId: 'column-todo',
    countTestId: 'count-todo',
  },
  {
    status: 'in_progress',
    title: 'En progreso',
    testId: 'column-in_progress',
    countTestId: 'count-in_progress',
  },
  {
    status: 'done',
    title: 'Hecho',
    testId: 'column-done',
    countTestId: 'count-done',
  },
];

// ---------------------------------------------------------------------------
// TaskCard — draggable card, reuses the same priority-colour system as InboxView
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

function TaskCard({ task, onDragStart }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid="task-card"
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-3 shadow-sm',
        'border-l-4',
        priorityBorderClass(task.priority),
        'cursor-grab active:cursor-grabbing select-none transition-colors hover:bg-accent/40',
      )}
    >
      <p className="truncate text-sm font-medium text-foreground">{task.name}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-xs text-muted-foreground">{formatRelative(task.createdAt)}</p>
        <Badge
          className={cn(
            'pointer-events-none select-none text-xs',
            priorityBadgeClass(task.priority),
          )}
        >
          {priorityLabel(task.priority)}
        </Badge>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardView
// ---------------------------------------------------------------------------

export default function BoardView() {
  const { tasks, setStatus, completeTask } = useTaskContext();

  /**
   * Tracks which column the user is currently dragging over.
   * Used to apply a visual highlight ring to the active drop zone.
   * Cleared on drop or when the pointer genuinely leaves the column.
   */
  const [dragOverColumn, setDragOverColumn] = useState<BoardStatus | null>(null);

  // Derived: partition board tasks by status. useMemo avoids recomputing on
  // unrelated re-renders (e.g. input focus in sibling views).
  const tasksByStatus = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done'),
    }),
    [tasks],
  );

  // ---- Drag handlers ----

  function handleDragStart(task: Task) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    };
  }

  /**
   * onDragEnter: fired when the drag enters the column (or any child).
   * We set the active column here so the highlight appears immediately.
   */
  function handleDragEnter(col: BoardStatus) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverColumn(col);
    };
  }

  /**
   * onDragOver: must call e.preventDefault() to allow dropping.
   * Also keeps dragOverColumn in sync in case dragEnter was missed.
   */
  function handleDragOver(col: BoardStatus) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(col);
    };
  }

  /**
   * onDragLeave: fires whenever the pointer leaves any element inside the column.
   * We only clear the highlight when the pointer leaves the column *entirely* —
   * i.e. the element it moved to (relatedTarget) is NOT a descendant of this column.
   *
   * If relatedTarget is null (pointer left the browser window) or is outside
   * the column, contains() returns false and we clear the highlight.
   */
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    const related = e.relatedTarget;
    if (!(related instanceof Node) || !e.currentTarget.contains(related)) {
      setDragOverColumn(null);
    }
  }

  /**
   * onDrop: perform the status change and clear the column highlight.
   *
   * Special case: dropping into the "done" column uses completeTask(id) instead of
   * setStatus(id, 'done') so that completedAt is set automatically by the action-creator.
   */
  function handleDrop(col: BoardStatus) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverColumn(null);
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      if (col === 'done') {
        completeTask(id);
      } else {
        setStatus(id, col);
      }
    };
  }

  // ---- Render ----

  return (
    <div className="flex flex-col py-6 h-full">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tablero</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrastrá las tarjetas entre columnas para cambiar su estado.
        </p>
      </div>

      {/* Three-column kanban grid — gap-3 at md (768 px), gap-4 at lg (1024 px+) */}
      <div className="grid flex-1 grid-cols-3 gap-3 md:gap-4 min-h-0">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus[col.status];
          const isOver = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              data-testid={col.testId}
              onDragEnter={handleDragEnter(col.status)}
              onDragOver={handleDragOver(col.status)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(col.status)}
              className={cn(
                'flex flex-col rounded-xl border border-border bg-muted/30 p-2 md:p-3 transition-colors duration-150',
                isOver && 'ring-2 ring-primary bg-accent/40',
              )}
            >
              {/* Column header with task counter */}
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {col.title}
                </h2>
                <Badge
                  variant="secondary"
                  data-testid={col.countTestId}
                  className="tabular-nums"
                >
                  {colTasks.length}
                </Badge>
              </div>

              {/* Task list or empty-state placeholder */}
              <div className="flex flex-1 flex-col gap-2">
                {colTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                    Sin tareas
                  </p>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
