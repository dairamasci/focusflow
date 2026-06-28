import { test, expect } from '@playwright/test';

/**
 * InboxView e2e tests.
 *
 * Each test is independent: beforeEach clears localStorage and reloads so
 * there is no shared state between runs.
 */

test.describe('InboxView', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inbox');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // --------------------------------------------------------------------------
  // Adding tasks
  // --------------------------------------------------------------------------

  test('agrega una tarea nueva con el botón Agregar', async ({ page }) => {
    await page.getByPlaceholder('Nueva tarea…').fill('Mi tarea de prueba');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Mi tarea de prueba')).toBeVisible();
  });

  test('agrega una tarea nueva presionando Enter', async ({ page }) => {
    const input = page.getByPlaceholder('Nueva tarea…');
    await input.fill('Tarea con Enter');
    await input.press('Enter');

    await expect(page.getByText('Tarea con Enter')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Priority rotation
  // --------------------------------------------------------------------------

  test('cambia la prioridad al hacer click en el badge (null → Urgente → Normal)', async ({
    page,
  }) => {
    // Add one task so a priority badge is visible
    await page.getByPlaceholder('Nueva tarea…').fill('Tarea prioritaria');
    await page.getByRole('button', { name: 'Agregar' }).click();

    const badge = page.getByTitle('Cambiar prioridad');

    // Initial label is "Sin prioridad" (priority === null)
    await expect(badge).toHaveText('Sin prioridad');

    // First click: null → urgent
    await badge.click();
    await expect(badge).toHaveText('Urgente');

    // Second click: urgent → normal
    await badge.click();
    await expect(badge).toHaveText('Normal');
  });

  // --------------------------------------------------------------------------
  // Move to board
  // --------------------------------------------------------------------------

  test('mueve una tarea al tablero y navega a /board', async ({ page }) => {
    // Add a task
    await page.getByPlaceholder('Nueva tarea…').fill('Tarea para tablero');
    await page.getByRole('button', { name: 'Agregar' }).click();

    // Set a priority so the "→ tablero" button appears (null → urgent)
    await page.getByTitle('Cambiar prioridad').click();

    // The task should now appear in the "Listas para el tablero" section
    await expect(page.getByRole('button', { name: '→ tablero' })).toBeVisible();

    // Click "→ tablero" — this sets status to 'todo' and navigates to /board
    await page.getByRole('button', { name: '→ tablero' }).click();

    // Should have navigated to /board
    await expect(page).toHaveURL(/\/board$/);

    // Navigate back to inbox: the task (now status 'todo') should NOT be visible there
    await page.goto('/inbox');
    await expect(page.getByText('Tarea para tablero')).not.toBeVisible();
  });
});
