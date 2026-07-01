import { useEffect } from 'react';
import { useStorage } from './useStorage';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'focusflow:theme';

/** Initial theme: stored preference wins; otherwise follow the OS setting. */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Theme hook. Persists the choice in localStorage and toggles the `dark` class
 * on <html> so Tailwind's dark variant (`&:is(.dark *)`) applies app-wide.
 *
 * A tiny inline script in index.html applies the same class before React mounts
 * to avoid a flash of the wrong theme on first paint.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useStorage<Theme>(STORAGE_KEY, getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
}
