// app/dashboard/MatrixSelectionPanel.tsx
"use client";

import { useState, FormEvent } from 'react';

// Tipos
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
  createMatrizAction: (formData: FormData) => Promise<ActionResponse>;
  syncEfectosAction: () => void;
};

// --- Iconos SVG para los botones ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const SyncIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.181 9.348a8.25 8.25 0 00-11.664 0l-3.18 3.185m3.181-9.348l-3.181-3.183a8.25 8.25 0 00-11.664 0l-3.18 3.185" />
  </svg>
);


export default function MatrixSelectionPanel({
  matrices,
  selectedMatrizId,
  onSelectMatriz,
  createMatrizAction,
  syncEfectosAction,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await createMatrizAction(formData);
    setIsModalOpen(false);
  };

  return (
    <>
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

        <div className="gestion-container">
          <button className="gestion-button" onClick={() => setIsModalOpen(true)}>
            <PlusIcon />
            Nueva Matriz
          </button>
          <button className="gestion-button" onClick={syncEfectosAction}>
            {/* CORRECCIÓN: Se añade el icono al botón */}
            <SyncIcon />
            Sincronizar Efectos
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Crear Nueva Matriz</h3>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre de la Matriz</label>
                <input id="nombre" name="nombre" placeholder="Ej: Escenario Principal" required />
              </div>
              <div className="form-group">
                <label htmlFor="filas">Filas</label>
                <input id="filas" name="filas" type="number" placeholder="Ej: 20" required />
              </div>
              <div className="form-group">
                <label htmlFor="columnas">Columnas</label>
                <input id="columnas" name="columnas" type="number" placeholder="Ej: 30" required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit">Crear Matriz</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}