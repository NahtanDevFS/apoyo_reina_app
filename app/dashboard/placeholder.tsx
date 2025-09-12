// app/dashboard/placeholder.tsx
"use client";

// Tipos (puedes moverlos a un archivo types.ts si prefieres)
type Matriz = { id: number; nombre: string; filas: number; columnas: number };

// CORRECCIÓN: Tipo para la respuesta de la acción del servidor
type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

type Props = {
  matrices: Matriz[];
  selectedMatrizId: number | null;
  onSelectMatriz: (id: number) => void;
  // Pasaremos las acciones del servidor como props
  createMatrizAction: (formData: FormData) => Promise<ActionResponse>;
  syncEfectosAction: () => Promise<ActionResponse>;
};

export default function MatrixSelectionPanel({
  matrices,
  selectedMatrizId,
  onSelectMatriz,
  createMatrizAction,
  syncEfectosAction,
}: Props) {
  return (
    <div className="card">
      <h2>Matrices</h2>
      <ul className="matrix-list">
        {matrices.map((matriz) => (
          <li key={matriz.id} className="matrix-list-item">
            <button
              onClick={() => onSelectMatriz(matriz.id)}
              className={selectedMatrizId === matriz.id ? "selected" : ""}
            >
              {matriz.nombre}
            </button>
          </li>
        ))}
      </ul>

      {/* Aquí podrías poner los formularios dentro de un acordeón */}
      <div style={{ marginTop: '2rem' }}>
        <h3>Gestión</h3>
        <form
          action={async (formData: FormData) => {
            await createMatrizAction(formData);
          }}
          style={{ marginBottom: '1rem' }}
        >
          <h4>Crear Nueva Matriz</h4>
          <input name="nombre" placeholder="Nombre de la Matriz" required />
          <input name="filas" type="number" placeholder="Filas" required />
          <input name="columnas" type="number" placeholder="Columnas" required />
          <button type="submit">Crear</button>
        </form>
        <div>
            <h4>Sincronizar Efectos</h4>
            <button onClick={() => syncEfectosAction()}>Sincronizar</button>
        </div>
      </div>
    </div>
  );
}