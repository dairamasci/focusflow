import { test, expect } from '@playwright/test';
import { html5DragAndDrop } from './helpers';

/**
 * BoardView e2e tests.
 *
 * NOTE on drag & drop: we use html5DragAndDrop() (dispatches native DragEvents
 * with a shared DataTransfer) instead of locator.dragTo() because the app wires
 * its columns exclusively to the HTML5 native DnD API — dragTo() only sends
 * mouse events and never triggers dragstart/drop handlers.
 */

test.describe('BoardView', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // --------------------------------------------------------------------------
  // Column rendering
  // --------------------------------------------------------------------------

  test('las tres columnas se renderizan con sus headings y contadores', async ({ page }) => {
    // All three columns must be visible
    await expect(page.getByTestId('column-todo')).toBeVisible();
    await expect(page.getByTestId('column-in_progress')).toBeVisible();
    await expect(page.getByTestId('column-done')).toBeVisible();

    // Column headings
    await expect(page.getByTestId('column-todo').getByText('Por hacer')).toBeVisible();
    await expect(page.getByTestId('column-in_progress').getByText('En progreso')).toBeVisible();
    await expect(page.getByTestId('column-done').getByText('Hecho')).toBeVisible();

    // Counters start at 0 when there are no tasks
    await expect(page.getByTestId('count-todo')).toHaveText('0');
    await expect(page.getByTestId('count-in_progress')).toHaveText('0');
    await expect(page.getByTestId('count-done')).toHaveText('0');
  });

  // --------------------------------------------------------------------------
  // Drag & drop
  // --------------------------------------------------------------------------

  test('arrastra una tarjeta: todo → in_progress → done, y persiste en localStorage', async ({
    page,
  }) => {
    // NOTE: Uses html5DragAndDrop() — see file-level comment above.

    // Seed two tasks with status 'todo'
    await page.evaluate(() => {
      const today = new Date().toISOString();
      const tasks = [
        {
          id: 'task-1',
          name: 'Primera tarea',
          priority: 'normal',
          status: 'todo',
          createdAt: today,
        },
        {
          id: 'task-2',
          name: 'Segunda tarea',
          priority: 'low',
          status: 'todo',
          createdAt: today,
        },
      ];
      localStorage.setItem('focusflow:tasks', JSON.stringify(tasks));
    });
    await page.reload();

    // Initial state: 2 in todo, 0 elsewhere
    await expect(page.getByTestId('count-todo')).toHaveText('2');
    await expect(page.getByTestId('count-in_progress')).toHaveText('0');
    await expect(page.getByTestId('count-done')).toHaveText('0');

    // ── Move "Primera tarea": todo → in_progress ────────────────────────────
    await html5DragAndDrop(page, 'Primera tarea', 'column-in_progress');

    await expect(page.getByTestId('count-todo')).toHaveText('1');
    await expect(page.getByTestId('count-in_progress')).toHaveText('1');

    // Card must appear inside the in_progress column
    await expect(
      page
        .getByTestId('column-in_progress')
        .locator('[data-testid="task-card"]')
        .filter({ hasText: 'Primera tarea' }),
    ).toBeVisible();

    // ── Move "Primera tarea": in_progress → done ────────────────────────────
    await html5DragAndDrop(page, 'Primera tarea', 'column-done');

    await expect(page.getByTestId('count-in_progress')).toHaveText('0');
    await expect(page.getByTestId('count-done')).toHaveText('1');

    // Dropping into 'done' must call completeTask(), which sets completedAt
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('focusflow:tasks'));
        if (!raw) return null;
        const tasks = JSON.parse(raw) as Array<{
          id: string;
          status: string;
          completedAt?: string;
        }>;
        const t = tasks.find((t) => t.id === 'task-1');
        return t ? { status: t.status, hasCompletedAt: !!t.completedAt } : null;
      })
      .toEqual({ status: 'done', hasCompletedAt: true });
  });
});
