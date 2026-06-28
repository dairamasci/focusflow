import { test, expect } from '@playwright/test';

/**
 * SummaryView e2e tests.
 *
 * The view derives all metrics from task data in localStorage. Tests that need
 * data seed localStorage before reloading so the React context picks it up.
 */

test.describe('SummaryView', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/summary');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------

  test('muestra el estado vacío cuando no hay tareas completadas hoy', async ({ page }) => {
    // No tasks seeded — localStorage was cleared in beforeEach
    await expect(page.getByTestId('summary-empty')).toBeVisible();
    await expect(page.getByTestId('stat-completed')).toHaveText('0');
    await expect(page.getByTestId('stat-new')).toHaveText('0');
  });

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------

  test('muestra las métricas correctas para el día actual', async ({ page }) => {
    // Seed: 1 task completed today with 25 min focus, 1 pending task created today
    await page.evaluate(() => {
      const today = new Date().toISOString();
      const tasks = [
        {
          id: 'done-1',
          name: 'Tarea completada hoy',
          priority: 'normal',
          status: 'done',
          createdAt: today,
          completedAt: today,
          focusTimeMs: 1_500_000, // 25 minutes
        },
        {
          id: 'pending-1',
          name: 'Tarea pendiente',
          priority: null,
          status: 'todo',
          createdAt: today,
        },
      ];
      localStorage.setItem('focusflow:tasks', JSON.stringify(tasks));
    });
    await page.reload();

    // stat-completed: 1 task is done with completedAt = today
    await expect(page.getByTestId('stat-completed')).toHaveText('1');

    // stat-new: 2 tasks were created today (done + pending)
    await expect(page.getByTestId('stat-new')).toHaveText('2');

    // stat-focus: 1 500 000 ms = 25 m → formatFocusDuration → "25m"
    await expect(page.getByTestId('stat-focus')).toHaveText('25m');

    // Completed tasks list shows exactly 1 item
    await expect(page.getByTestId('completed-item')).toHaveCount(1);
    await expect(page.getByTestId('completed-item')).toContainText('Tarea completada hoy');
  });

  // --------------------------------------------------------------------------
  // Close day
  // --------------------------------------------------------------------------

  test('cerrar el día navega a /inbox, persiste dailyStats y hace rollover de tareas', async ({
    page,
  }) => {
    // Seed same data as the metrics test
    await page.evaluate(() => {
      const today = new Date().toISOString();
      const tasks = [
        {
          id: 'done-1',
          name: 'Tarea completada hoy',
          priority: 'normal',
          status: 'done',
          createdAt: today,
          completedAt: today,
          focusTimeMs: 1_500_000,
        },
        {
          id: 'pending-1',
          name: 'Tarea pendiente',
          priority: null,
          status: 'todo',
          createdAt: today,
        },
      ];
      localStorage.setItem('focusflow:tasks', JSON.stringify(tasks));
    });
    await page.reload();

    // Click "Cerrar el día"
    await page.getByTestId('close-day').click();

    // Must navigate to /inbox
    await expect(page).toHaveURL(/\/inbox$/);

    // dailyStats must have an entry for today with the correct metrics
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('focusflow:dailyStats'));
        if (!raw) return null;
        const stats = JSON.parse(raw) as Record<
          string,
          { date: string; completedCount: number; newTasksCount: number; totalFocusMs: number }
        >;
        const todayKey = new Date().toISOString().slice(0, 10);
        return stats[todayKey] ?? null;
      })
      .toMatchObject({ completedCount: 1, newTasksCount: 2, totalFocusMs: 1_500_000 });

    // Rollover: non-completed tasks must have been moved back to 'inbox'
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('focusflow:tasks'));
        if (!raw) return null;
        const tasks = JSON.parse(raw) as Array<{ id: string; status: string }>;
        const pending = tasks.find((t) => t.id === 'pending-1');
        return pending?.status ?? null;
      })
      .toBe('inbox');
  });
});
