export default function BoardView() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Tablero</h1>
      <p className="text-muted-foreground">
        Vista kanban con columnas por estado: Pendiente, En progreso y Completada. Arrastrá las
        tarjetas para cambiar su estado.
      </p>
    </div>
  )
}
