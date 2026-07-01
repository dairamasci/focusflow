import { test, expect } from '@playwright/test';

/**
 * ArchiveView + "archive on close day" behavior.
 *
 * When the day is closed, `done` tasks become `archived`: they leave the board's
 * "Hecho" column but remain forever in the Archive, grouped by date.
 */

test.describe('ArchiveView', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/archive');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('agrupa las completadas por día (Hoy / Ayer / fecha) e ignora las no completadas', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const at = (daysAgo: number, h: number, m: number) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };
      const tasks = [
        { id: 'a', name: 'Hoy temprano', priority: 'low', status: 'done', createdAt: at(0, 9, 0), completedAt: at(0, 9, 30), focusTimeMs: 900000 },
        { id: 'b', name: 'Hoy tarde', priority: 'urgent', status: 'done', createdAt: at(0, 14, 0), completedAt: at(0, 16, 0), focusTimeMs: 4500000 },
        { id: 'c', name: 'Cosa de ayer', priority: 'normal', status: 'archived', createdAt: at(1, 10, 0), completedAt: at(1, 11, 0), focusTimeMs: 1800000 },
        { id: 'd', name: 'Pendiente', priority: 'urgent', status: 'in_progress', createdAt: at(0, 8, 0) },
      ];
      localStorage.setItem('focusflow:tasks', JSON.stringify(tasks));
    });
    await page.reload();

    // Only completed (done + archived) tasks: 3 items, not the in_progress one.
    await expect(page.getByTestId('archive-item')).toHaveCount(3);
    await expect(page.getByText('Pendiente')).toHaveCount(0);

    // Day headers: "Hoy" first, then "Ayer" (case-insensitive: rendered uppercase).
    const headers = (await page.locator('section h2').allInnerTexts()).map((h) => h.trim().toLowerCase());
    expect(headers[0]).toBe('hoy');
    expect(headers[1]).toBe('ayer');

    // Within "Hoy", newest first.
    const hoy = await page.locator('section').first().getByTestId('archive-item').allInnerTexts();
    expect(hoy[0]).toContain('Hoy tarde');
    expect(hoy[1]).toContain('Hoy temprano');
  });

  test('cerrar el día archiva las tareas done: salen del tablero y quedan en el archivo', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const today = new Date().toISOString();
      const tasks = [
        { id: 'done-1', name: 'Terminada hoy', priority: 'normal', status: 'done', createdAt: today, completedAt: today, focusTimeMs: 1_200_000 },
        { id: 'todo-1', name: 'Aún pendiente', priority: 'urgent', status: 'todo', createdAt: today },
      ];
      localStorage.setItem('focusflow:tasks', JSON.stringify(tasks));
    });

    // Before closing: the done task is in the board's "Hecho" column.
    await page.goto('/board');
    await expect(page.getByTestId('count-done')).toHaveText('1');

    // Close the day from the summary.
    await page.goto('/summary');
    await page.getByTestId('close-day').click();
    await expect(page).toHaveURL(/\/inbox$/);

    // The done task is now 'archived'; the pending one rolled to 'inbox'.
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('focusflow:tasks'));
        const tasks = JSON.parse(raw ?? '[]') as Array<{ id: string; status: string }>;
        return Object.fromEntries(tasks.map((t) => [t.id, t.status]));
      })
      .toEqual({ 'done-1': 'archived', 'todo-1': 'inbox' });

    // Board "Hecho" is now empty…
    await page.goto('/board');
    await expect(page.getByTestId('count-done')).toHaveText('0');

    // …but the task still shows in the Archive.
    await page.goto('/archive');
    await expect(page.getByTestId('archive-item')).toHaveCount(1);
    await expect(page.getByText('Terminada hoy')).toBeVisible();
  });
});
