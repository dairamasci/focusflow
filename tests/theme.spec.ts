import { test, expect } from '@playwright/test';

/**
 * Dark mode toggle. Toggling flips the `dark` class on <html> and persists the
 * choice in localStorage (`focusflow:theme`), surviving a reload.
 */

test.describe('Dark mode', () => {
  test('el toggle alterna el tema y lo persiste', async ({ page }) => {
    // Start from a known light theme.
    await page.goto('/inbox');
    await page.evaluate(() => {
      localStorage.setItem('focusflow:theme', JSON.stringify('light'));
    });
    await page.reload();

    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    // Toggle → dark
    await page.getByTestId('theme-toggle').click();
    await expect(html).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('focusflow:theme'))).toBe('"dark"');

    // Persists across reload
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    // Toggle back → light
    await page.getByTestId('theme-toggle').click();
    await expect(html).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('focusflow:theme'))).toBe('"light"');
  });
});
