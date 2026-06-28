import type { Page } from '@playwright/test';

/**
 * Dispatches native HTML5 DragEvents to simulate drag & drop in the browser.
 *
 * WHY this helper instead of locator.dragTo():
 * Playwright's built-in dragTo() sends synthetic mouse events (mousedown,
 * mousemove, mouseup) which do NOT fire the HTML5 native drag events
 * (dragstart, dragenter, dragover, drop). This app's BoardView is wired
 * exclusively to the native DnD API via onDragStart / onDrop handlers, so
 * dragTo() would silently do nothing. We instead dispatch real DragEvent
 * objects with a shared DataTransfer instance so the app's handlers fire
 * correctly and the task id travels from dragstart → drop.
 */
export async function html5DragAndDrop(
  page: Page,
  cardText: string,
  targetTestId: string,
): Promise<void> {
  await page.evaluate(
    ({ cardText, targetTestId }) => {
      const cards = Array.from(document.querySelectorAll('[data-testid="task-card"]'));
      const card = cards.find((el) => el.textContent?.includes(cardText));
      const target = document.querySelector(`[data-testid="${targetTestId}"]`);

      if (!card || !target) {
        throw new Error(
          `html5DragAndDrop: element not found — card="${cardText}", target="${targetTestId}"`,
        );
      }

      // A single DataTransfer shared across all events so setData (dragstart)
      // and getData (drop) read the same store.
      const dt = new DataTransfer();

      const fire = (el: Element, type: string) =>
        el.dispatchEvent(
          new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }),
        );

      fire(card, 'dragstart');
      fire(target, 'dragenter');
      fire(target, 'dragover');
      fire(target, 'drop');
      fire(card, 'dragend');
    },
    { cardText, targetTestId },
  );
}
