import confetti from 'canvas-confetti';

/**
 * Fire a celebratory multi-burst of confetti.
 * Used when the user closes their day — a small reward for finishing.
 *
 * Uses the canvas-confetti "realistic" recipe: several bursts with different
 * spreads/velocities so it looks fuller than a single pop.
 */
export function celebrate(): void {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b'];

  const fire = (particleRatio: number, opts: confetti.Options) => {
    void confetti({
      origin: { y: 0.7 },
      colors,
      particleCount: Math.floor(200 * particleRatio),
      ...opts,
    });
  };

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
