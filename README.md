# Focus Flow

Una app de gestión de tareas con **modo foco**, pensada para personas que tienden a saltar entre tareas.

## El Problema

Durante un día de trabajo, el plan inicial suele romperse. Nuevas tareas surgen, prioridades cambian, y es fácil perder el hilo de lo que estabas haciendo. **Focus Flow** no intenta resolver la organización perfecta de tareas — lo que resuelve es **mantener el foco cuando el caos llega**.

La app te ayuda a:
1. **Capturar** rápido ideas nuevas sin perder concentración
2. **Priorizar** con decisiones simples (Urgente → Normal → Baja)
3. **Trabajar concentrado** en una tarea a la vez, con un cronómetro que registra tiempo real dedicado
4. **Revisar** qué hiciste hoy y qué queda pendiente para mañana

## Características Principales

### Bandeja (`/inbox`)
Captura rápida de ideas y tareas. Cada tarea tiene un badge de prioridad clicable que rota entre:
- Sin prioridad → Urgente → Normal → Baja

Una vez priorizada, se mueve al tablero de trabajo.

### Tablero (`/board`)
Un kanban con tres columnas y **drag & drop** nativo (API HTML5):
- **Por hacer** — tareas nuevas esperando
- **En progreso** — lo que estás haciendo ahora
- **Hecho** — tareas completadas (soltar en esta columna las marca automáticamente)

Arrastrar una tarjeta es la forma principal de navegar tu flujo de trabajo.

### Foco (`/focus`)
Modo de trabajo concentrado. Elegís una tarea y arranca un cronómetro (formato mm:ss) con:
- **Pausar / Reanudar** — pausas normales sin perder tiempo acumulado
- **Completar** — marca la tarea como hecha y registra el tiempo total
- **Abandonar** — termina el foco sin completar (tiempo se suma igual)

Mientras hay un foco activo, el resto de la navegación se atenúa para evitar distracciones. El tiempo en foco se acumula por tarea, incluso si pausas y reanudas.

### Resumen (`/summary`)
Métricas del día:
- Tareas completadas
- Tareas que surgieron (capturadas en bandeja)
- Tiempo total dedicado a foco

También muestra la lista de completadas con su tiempo individual. El botón **"Cerrar el día"** hace rollover: guarda las estadísticas del día y mueve todas las tareas no completadas de vuelta a la bandeja para el día siguiente.

## Stack Técnico

| Herramienta | Versión | Uso |
|---|---|---|
| **React** | 19.2 | UI framework |
| **TypeScript** | 6.0 | Type safety |
| **Vite** | 8.1 | Bundler y dev server |
| **React Router** | 7.18 | Rutas reales (`/inbox`, `/board`, `/focus`, `/summary`) |
| **Tailwind CSS** | 4.3 | Estilos |
| **shadcn/ui** | — | Componentes copiados en `src/components/ui/` |
| **date-fns** | 4.4 | Formateo de fechas (español) |
| **Playwright** | 1.61 | Tests e2e |
| **Node** | 22 LTS | Runtime requerido |

**Estado global:** `useReducer` + Context API (`TaskContext`, `FocusContext`), sin librerías de estado externas.

**Persistencia:** `localStorage` — toda la data vive en el navegador (claves `focusflow:tasks` y `focusflow:dailyStats`).

## Instalación y Desarrollo

### Requisitos
- Node 22+ (o usar `nvm` para cambiar versión)

### Instalación
```bash
# Clonar el repositorio
git clone <repo-url>
cd focusflow

# Instalar dependencias
npm install
```

### Desarrollo
```bash
# Levantar el dev server
npm run dev
```

El servidor estará en `http://localhost:5173` con HMR (hot reload) habilitado.

### Build para Producción
```bash
# Typecheck + build
npm run build

# Previewear el build (opcional)
npm run preview
```

### Linting
```bash
# Correr oxlint
npm run lint
```

### Tests E2E
```bash
# PRIMERA VEZ: instalar el browser de Chromium
npx playwright install chromium

# Correr tests
npm test
```

Los tests se ejecutan en Chromium. El drag & drop nativo se testea despachando `DragEvent` manualmente (la herramienta `dragTo` de Playwright no dispara la API HTML5).

## Estructura del Proyecto

```
src/
├── components/          # Componentes UI y layout
│   ├── ui/              # shadcn/ui (copiados)
│   └── *.tsx            # Componentes específicos
├── views/               # Las 4 vistas principales
│   ├── InboxView.tsx
│   ├── BoardView.tsx
│   ├── FocusView.tsx
│   └── SummaryView.tsx
├── context/             # Estado global
│   ├── TaskContext.tsx
│   └── FocusContext.tsx
├── hooks/               # Hooks personalizados
│   └── useStorage.ts
├── utils/               # Funciones de utilidad
│   ├── dates.ts         # Formateo de fechas
│   └── ids.ts           # Generación de IDs únicos
├── lib/                 # Librerías internas
│   ├── priority.ts      # Colores, labels y lógica de prioridades
│   └── utils.ts         # shadcn/utils (cn())
├── types/               # Tipos TypeScript
│   └── index.ts         # Task, Daily Stats, Focus State, etc.
├── App.tsx              # Rutas (React Router)
├── index.css            # Tailwind imports
└── main.tsx             # Entry point
```

## Decisiones Técnicas

### React Router con Rutas Reales
En lugar de navegación con `useState`, usamos React Router (`/inbox`, `/board`, `/focus`, `/summary`). Esto permite:
- Deep-linking (compartir URLs con estado específico)
- Historial del navegador (botón atrás)
- Mejor testing

### Estado con useReducer + Context API
- Reducers puros: los timestamps y la fecha actual los provee quien despacha la acción (para determinismo en tests)
- Sin librerías de estado externas (Redux, Zustand) — el scope es pequeño
- Dos contextos separados: `TaskContext` (tareas) y `FocusContext` (sesión de foco actual)

### Persistencia en localStorage
- Claves: `focusflow:tasks` y `focusflow:dailyStats`
- Fechas guardadas como ISO strings
- Sincronización manual en cada cambio (sin debounce; la app es rápida)

### Drag & Drop Nativo
Usamos la API HTML5 (`ondragstart`, `ondragover`, `ondrop`) en lugar de librerías como `@dnd-kit`:
- Más simple y bueno para aprender la API del navegador
- Menos dependencias
- Se testea despachando `DragEvent`
- Limitación: no funciona bien en táctil (candidato para v2)

### Fuente Única de Prioridades
Archivo `src/lib/priority.ts` centraliza:
- Colores (Tailwind)
- Labels ("Urgente", "Normal", "Baja")
- Orden de rotación en badges

### Tests E2E con Playwright
- Solo Chromium (velocidad y estabilidad; la app no tiene código browser-specific)
- `reuseExistingServer` para aprovechar un dev server ya levantado
- DnD se testea despachando eventos, no con `dragTo` (la API HTML5 nativa no se activa con eventos de mouse)

## Ideas para v2

- **Autenticación + Sync** — Supabase u otro para sincronizar entre dispositivos
- **Notificación Pomodoro** — Alert a los 25 min de foco
- **Exportar Stats** — CSV semanal o reporte
- **Etiquetas/Tags** — Además de prioridad, categorizar por proyecto
- **Drag & Drop Táctil** — Migrar a `@dnd-kit` para soporte en móvil
- **Dark Mode** — Toggle en settings
- **Gráfico Semanal** — Línea de tiempo en foco en el Resumen

---

**Registro detallado de decisiones técnicas:** ver `STATUS.md` (log de desarrollo local).

Hecho con ❤️ para mantener el foco.
