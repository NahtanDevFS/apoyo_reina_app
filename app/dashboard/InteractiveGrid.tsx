// app/dashboard/InteractiveGrid.tsx
"use client";

// Tipos
type Matriz = { id: number; nombre: string; filas: number; columnas: number };
type Efecto = { id: number; nombre: string; nombre_css: string };
type Celda = { id: number; matriz_id: number; fila: number; columna: number; estado_celda: number; efecto_id: number | null; letra_asignada: string | null; };

type Props = {
  matriz: Matriz | undefined;
  celdas: Celda[];
  efectos: Efecto[];
  selectedCeldas: Set<number>;
  onCeldaClick: (id: number) => void;
};

export default function InteractiveGrid({
  matriz,
  celdas,
  efectos,
  selectedCeldas,
  onCeldaClick,
}: Props) {
  if (!matriz) {
    return (
      <div className="card interactive-grid-container">
        <h2>Previsualización</h2>
        <p>Selecciona una matriz de la lista para empezar a controlar.</p>
      </div>
    );
  }

  return (
    <div className="card interactive-grid-container">
      <h2>{matriz.nombre}</h2>
      <div
        className="matriz-grid"
        style={{ gridTemplateColumns: `repeat(${matriz.columnas}, 1fr)` }}
      >
        {celdas.map((celda) => {
           const efectoAplicado = efectos.find(e => e.id === celda.efecto_id);
           return (
            <div
              key={celda.id}
              className={`celda ${celda.estado_celda === 1 ? 'ocupada' : 'libre'} ${selectedCeldas.has(celda.id) ? 'seleccionada' : ''} ${efectoAplicado ? `efecto-${efectoAplicado.nombre_css}` : ''}`}
              onClick={() => onCeldaClick(celda.id)}
              title={`Fila: ${celda.fila}, Col: ${celda.columna}`}
            >
              {celda.letra_asignada && <span>{celda.letra_asignada}</span>}
            </div>
           )
        })}
      </div>
    </div>
  );
}
