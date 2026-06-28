import { test, expect } from '@playwright/test';

/**
 * FocusView e2e tests.
 *
 * beforeEach seeds one task with status 'todo' so all tests start from the
 * selector screen with one candidate available.
 */

test.describe('FocusView', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/focus');
    await page.evaluate(() => {
      localStorage.clear();
      const today = new Date().toISOString();
      const tasks = [
        {
          id: 'focus-task-1',
          name: 'Tarea para enfoque',
          priority: 'normal',
          status: 'todo',
          createdAt: today,
        },
      ];
      localStorage.setItem('focusflow:tasks', JSON.stringify(tasks));
    });
    await page.reload();
  });

  // --------------------------------------------------------------------------
  // Enter focus mode
  // --------------------------------------------------------------------------

  test('selecciona una tarea y entra en modo foco', async ({ page }) => {
    // Selector mode: one candidate visible
    const candidate = page.getByTestId('focus-candidate');
    await expect(candidate).toBeVisible();
    await expect(candidate).toContainText('Tarea para enfoque');

    // Click the candidate to start a focus session
    await candidate.click();

    // Focus mode UI should appear
    await expect(page.getByTestId('focus-timer')).toBeVisible();
    await expect(page.getByTestId('focus-toggle')).toBeVisible();
    await expect(page.getByTestId('focus-complete')).toBeVisible();
    await expect(page.getByTestId('focus-abandon')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Timer advances
  // --------------------------------------------------------------------------

  test('el timer avanza después de iniciar el foco', async ({ page }) => {
    // Enter focus mode
    await page.getByTestId('focus-candidate').click();

    const timer = page.getByTestId('focus-timer');

    // Timer starts at 00:00
    await expect(timer).toHaveText('00:00');

    // Wait ~2.5 s — the timer ticks every 1 s, so at least 1-2 ticks should fire
    await page.waitForTimeout(2500);

    // Parse mm:ss and verify at least 1 second has elapsed
    const text = await timer.textContent();
    const [minPart, secPart] = (text ?? '00:00').split(':');
    const totalSeconds = parseInt(minPart ?? '0', 10) * 60 + parseInt(secPart ?? '0', 10);
    expect(totalSeconds).toBeGreaterThanOrEqual(1);
  });

  // --------------------------------------------------------------------------
  // Complete task
  // --------------------------------------------------------------------------

  test('completar la tarea vuelve al selector y marca la tarea como done con focusTimeMs > 0', async ({
    page,
  }) => {
    // Enter focus mode
    await page.getByTestId('focus-candidate').click();
    await expect(page.getByTestId('focus-timer')).toBeVisible();

    // Wait >1 s so that at least one tick fires and focusTimeMs is recorded
    await page.waitForTimeout(1500);

    // Complete the task
    await page.getByTestId('focus-complete').click();

    // focus-timer disappears — we are back in selector mode
    await expect(page.getByTestId('focus-timer')).not.toBeVisible();

    // Task must be 'done' in localStorage with focusTimeMs > 0
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('focusflow:tasks'));
        if (!raw) return null;
        const tasks = JSON.parse(raw) as Array<{
          id: string;
          status: string;
          focusTimeMs?: number;
        }>;
        const task = tasks.find((t) => t.id === 'focus-task-1');
        if (!task) return null;
        return { status: task.status, focusTimeOk: (task.focusTimeMs ?? 0) > 0 };
      })
      .toEqual({ status: 'done', focusTimeOk: true });
  });
});
