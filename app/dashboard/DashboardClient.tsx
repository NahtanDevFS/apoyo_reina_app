// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import "./Dashboard.css";

// Tipos para nuestros datos (sin cambios)
type Matriz = { id: number; nombre: string; filas: number; columnas: number };
type Efecto = { id: number; nombre: string; nombre_css: string };
type Celda = { id: number; matriz_id: number; fila: number; columna: number; estado_celda: number; efecto_id: number | null };

// Props que el componente cliente recibirá (actualizadas)
type DashboardClientProps = {
  initialMatrices: Matriz[];
  initialEfectos: Efecto[];
  getCeldasAction: (matrizId: number) => Promise<Celda[] | null>;
  createMatrizAction: (formData: FormData) => Promise<any>;
  syncEfectosAction: () => Promise<any>; // ¡Nueva prop para la acción de sincronizar!
  applyEfectoAction: (celdaIds: number[], efectoId: number | null) => Promise<any>;
  applyGlobalEfectoAction: (nombreEfecto: string) => Promise<any>;
  liberarCeldasAction: (celdaIds: number[]) => Promise<any>;
};

export default function DashboardClient({
  initialMatrices,
  initialEfectos,
  getCeldasAction,
  createMatrizAction,
  syncEfectosAction, // Usamos la nueva prop
  applyEfectoAction,
  applyGlobalEfectoAction,
  liberarCeldasAction
}: DashboardClientProps) {
  // Hooks de estado (sin cambios)
  const [matrices] = useState(initialMatrices);
  const [efectos, setEfectos] = useState(initialEfectos); // Permitimos que se actualice
  const [selectedMatrizId, setSelectedMatrizId] = useState<number | null>(
    initialMatrices[0]?.id || null
  );
  const [celdas, setCeldas] = useState<Celda[]>([]);
  const [selectedCeldas, setSelectedCeldas] = useState<Set<number>>(new Set());
  const [selectedEfectoId, setSelectedEfectoId] = useState<string>("");
  
  const [isPending, startTransition] = useTransition();

  // Actualizamos la lista de efectos en el cliente cuando cambien las props
  useEffect(() => {
    setEfectos(initialEfectos);
  }, [initialEfectos]);

  // Resto de los useEffect y handlers (sin cambios)...
  useEffect(() => {
    if (!selectedMatrizId) return;
    getCeldasAction(selectedMatrizId).then((data) => {
      if (data) setCeldas(data);
    });
  }, [selectedMatrizId, getCeldasAction]);

  const matrizActual = matrices.find(m => m.id === selectedMatrizId);

  const handleCeldaClick = (celdaId: number) => {
    const newSelection = new Set(selectedCeldas);
    if (newSelection.has(celdaId)) newSelection.delete(celdaId);
    else newSelection.add(celdaId);
    setSelectedCeldas(newSelection);
  };
  
  const handleApplyEfecto = () => {
    if (selectedCeldas.size === 0 || !selectedEfectoId) return;
    const efectoId = selectedEfectoId === 'ninguno' ? null : Number(selectedEfectoId);
    
    startTransition(async () => {
        await applyEfectoAction(Array.from(selectedCeldas), efectoId);
        if(selectedMatrizId) {
            const updatedCeldas = await getCeldasAction(selectedMatrizId);
            if (updatedCeldas) setCeldas(updatedCeldas);
        }
        setSelectedCeldas(new Set());
    });
  };

  const handleLiberar = () => {
    if (selectedCeldas.size === 0) return;
     startTransition(async () => {
        await liberarCeldasAction(Array.from(selectedCeldas));
        if(selectedMatrizId) {
            const updatedCeldas = await getCeldasAction(selectedMatrizId);
            if (updatedCeldas) setCeldas(updatedCeldas);
        }
        setSelectedCeldas(new Set());
    });
  }
  
  // ¡NUEVO HANDLER PARA SINCRONIZAR!
  const handleSyncEfectos = () => {
    startTransition(async () => {
      const result = await syncEfectosAction();
      if(result.success) alert(result.message);
      else if(result.error) alert(`Error: ${result.error}`);
    });
  }

  return (
    <div className="dashboard">
      <h1>Dashboard de Administrador</h1>
      <div className="panels">
        {/* Panel de Gestión */}
        <div className="panel-gestion">
          <section>
            <h2>Gestión de Matrices</h2>
            <form action={createMatrizAction}>
              <input name="nombre" placeholder="Nombre de la Matriz" required />
              <input name="filas" type="number" placeholder="Filas" required />
              <input name="columnas" type="number" placeholder="Columnas" required />
              <button type="submit">Crear Matriz</button>
            </form>
          </section>
          {/* --- SECCIÓN DE EFECTOS MODIFICADA --- */}
          <section>
            <h2>Gestión de Efectos</h2>
            <p>
              Añade nuevos efectos en el archivo <code>efectos.css</code> y luego sincronízalos aquí.
            </p>
            <button onClick={handleSyncEfectos} disabled={isPending}>
              Sincronizar Efectos Predeterminados
            </button>
          </section>
        </div>
        {/* Panel de Control (sin cambios) */}
        <div className="panel-control">
          {/* ... (el resto del panel de control se mantiene igual) ... */}
           <section>
            <h2>Control de Efectos Globales</h2>
            <div className="global-controls">
                {efectos.map(e => (
                    <button key={e.id} onClick={() => startTransition(() => applyGlobalEfectoAction(e.nombre_css))}>
                        {e.nombre}
                    </button>
                ))}
                <button onClick={() => startTransition(() => applyGlobalEfectoAction('inicial'))}>
                    Resetear Global
                </button>
            </div>
          </section>
          <section className="matriz-controls">
             <h2>Control por Celda</h2>
             <select onChange={(e) => setSelectedMatrizId(Number(e.target.value))} value={selectedMatrizId || ''}>
                <option disabled value="">Selecciona una matriz</option>
                {matrices.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
             </select>
             <select onChange={(e) => setSelectedEfectoId(e.target.value)} value={selectedEfectoId}>
                <option disabled value="">Selecciona un efecto</option>
                <option value="ninguno">Ninguno (Resetear)</option>
                {efectos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
             </select>
             <button onClick={handleApplyEfecto} disabled={isPending || selectedCeldas.size === 0}>
                Aplicar a {selectedCeldas.size} celdas
             </button>
              <button onClick={handleLiberar} disabled={isPending || selectedCeldas.size === 0}>
                Liberar {selectedCeldas.size} celdas
             </button>
          </section>
        </div>
      </div>
      {/* Visualizador de Matriz (sin cambios) */}
      {matrizActual && (
        <div className="matriz-container">
            <h3>{matrizActual.nombre} ({selectedCeldas.size} seleccionadas)</h3>
            <div
                className="matriz-grid"
                style={{ gridTemplateColumns: `repeat(${matrizActual.columnas}, 1fr)` }}
            >
                {celdas.map((celda) => {
                    const efectoAplicado = efectos.find(e => e.id === celda.efecto_id);
                    return <div key={celda.id} className={`celda ${celda.estado_celda === 1 ? 'ocupada' : 'libre'} ${selectedCeldas.has(celda.id) ? 'seleccionada' : ''} ${efectoAplicado ? `efecto-${efectoAplicado.nombre_css}` : ''}`} onClick={() => handleCeldaClick(celda.id)} title={`Fila: ${celda.fila}, Col: ${celda.columna}`} />;
                })}
            </div>
        </div>
      )}
    </div>
  );
}