import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Target, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusContext } from '@/context/FocusContext'
import { useTheme } from '@/hooks/useTheme'

const NAV_LINKS = [
  { to: '/inbox', label: 'Bandeja' },
  { to: '/board', label: 'Tablero' },
  { to: '/focus', label: 'Foco' },
  { to: '/summary', label: 'Resumen' },
  { to: '/archive', label: 'Archivo' },
] as const

function formatTodayInSpanish(): string {
  const raw = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function Layout() {
  const today = formatTodayInSpanish()
  const { activeTaskId } = useFocusContext()
  const isFocusActive = activeTaskId !== null
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg tracking-tight">Focus Flow</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Hide date below 640 px; visible at sm (640 px) and above, including 768 px */}
            <span className="hidden sm:block text-sm text-muted-foreground">{today}</span>
            <button
              type="button"
              onClick={toggleTheme}
              data-testid="theme-toggle"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav
          className="max-w-5xl mx-auto px-2 sm:px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navegación principal"
        >
          <ul className="flex gap-1 w-max">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'block shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                      isFocusActive && to !== '/focus' && 'opacity-40 pointer-events-none'
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Key by pathname so React remounts the wrapper on every route change,
            re-triggering the entrance animation (subtle fade-in). */}
        <div key={location.pathname} className="animate-in fade-in duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
