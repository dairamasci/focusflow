import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '@/types';
import { useTaskContext } from '@/context/TaskContext';
import { formatRelative } from '@/utils/dates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  nextPriority,
  priorityLabel,
  priorityBorderClass,
  priorityBadgeClass,
} from '@/lib/priority';

// ---------------------------------------------------------------------------
// TaskCard — internal component, stays in this file for simplicity
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: Task;
  onPriorityClick: () => void;
  onSendToBoard?: () => void;
}

function TaskCard({ task, onPriorityClick, onSendToBoard }: TaskCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm',
        'border-l-4',
        priorityBorderClass(task.priority),
      )}
    >
      {/* Task name + timestamp */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{task.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatRelative(task.createdAt)}
        </p>
      </div>

      {/* Priority badge — clickable, rotates through the cycle */}
      <button
        type="button"
        onClick={onPriorityClick}
        title="Cambiar prioridad"
        className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Badge
          className={cn(
            'pointer-events-none select-none',
            priorityBadgeClass(task.priority),
          )}
        >
          {priorityLabel(task.priority)}
        </Badge>
      </button>

      {/* "Send to board" button — only shown when the task already has a priority */}
      {onSendToBoard !== undefined && (
        <Button
          size="sm"
          variant="outline"
          onClick={onSendToBoard}
          title="Mover al tablero"
          className="shrink-0"
        >
          → tablero
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InboxView
// ---------------------------------------------------------------------------

export default function InboxView() {
  const { tasks, addTask, setPriority, setStatus } = useTaskContext();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');

  // Derived lists — only inbox tasks
  const { unprioritized, prioritized } = useMemo(() => {
    const inbox = tasks.filter((t) => t.status === 'inbox');
    return {
      unprioritized: inbox.filter((t) => t.priority === null),
      prioritized: inbox.filter((t) => t.priority !== null),
    };
  }, [tasks]);

  // ---- handlers ----

  function handleAdd() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    addTask(trimmed);
    setInputText('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd();
  }

  function handlePriorityClick(task: Task) {
    setPriority(task.id, nextPriority(task.priority));
  }

  function handleSendToBoard(task: Task) {
    setStatus(task.id, 'todo');
    void navigate('/board');
  }

  // ---- render ----

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bandeja de entrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capturá ideas rápido y priorizalas antes de moverlas al tablero.
        </p>
      </div>

      {/* Add-task input */}
      <div className="flex gap-2">
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nueva tarea…"
          className="flex-1"
          autoFocus
        />
        <Button onClick={handleAdd} disabled={!inputText.trim()}>
          Agregar
        </Button>
      </div>

      {/* Section: unprioritized */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Sin priorizar
        </h2>
        {unprioritized.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">
            No hay tareas sin priorizar.
          </p>
        ) : (
          <ul className="space-y-2">
            {unprioritized.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onPriorityClick={() => handlePriorityClick(task)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section: prioritized (ready for board) */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Listas para el tablero
        </h2>
        {prioritized.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">
            Aún no hay tareas priorizadas. Hacé click en "Sin prioridad" para asignar una.
          </p>
        ) : (
          <ul className="space-y-2">
            {prioritized.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onPriorityClick={() => handlePriorityClick(task)}
                  onSendToBoard={() => handleSendToBoard(task)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
