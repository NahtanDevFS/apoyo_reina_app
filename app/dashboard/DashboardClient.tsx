// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import "./Dashboard.css";

// Definimos los tipos directamente en este archivo
type Matriz = { id: number; nombre: string; filas: number; columnas: number };
type Efecto = { id: number; nombre: string; nombre_css: string };
type Celda = {
  id: number;
  matriz_id: number;
  fila: number;
  columna: number;
  estado_celda: number;
  efecto_id: number | null;
  letra_asignada: string | null;
};

// Props que el componente cliente recibirá
type DashboardClientProps = {
  initialMatrices: Matriz[];
  initialEfectos: Efecto[];
  getCeldasAction: (matrizId: number) => Promise<Celda[] | null>;
  createMatrizAction: (formData: FormData) => Promise<any>;
  syncEfectosAction: () => Promise<any>;
  applyEfectoAction: (
    celdaIds: number[],
    efectoId: number | null
  ) => Promise<any>;
  applyGlobalEfectoAction: (nombreEfecto: string) => Promise<any>;
  liberarCeldasAction: (celdaIds: number[]) => Promise<any>;
  applyLetraAction: (celdaId: number, letra: string) => Promise<any>;
};

export default function DashboardClient({
  initialMatrices,
  initialEfectos,
  getCeldasAction,
  createMatrizAction,
  syncEfectosAction,
  applyEfectoAction,
  applyGlobalEfectoAction,
  liberarCeldasAction,
  applyLetraAction,
}: DashboardClientProps) {
  const [matrices, setMatrices] = useState(initialMatrices);
  const [efectos, setEfectos] = useState(initialEfectos);
  const [celdasPorMatriz, setCeldasPorMatriz] = useState<
    Record<number, Celda[]>
  >({});
  const [selectedCeldas, setSelectedCeldas] = useState<Set<number>>(new Set());
  const [selectedEfectoId, setSelectedEfectoId] = useState<string>("");
  const [letra, setLetra] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchAllCeldas = async () => {
      const allCeldasData: Record<number, Celda[]> = {};
      for (const matriz of initialMatrices) {
        const celdas = await getCeldasAction(matriz.id);
        if (celdas) allCeldasData[matriz.id] = celdas;
      }
      setCeldasPorMatriz(allCeldasData);
    };
    if (initialMatrices.length > 0) fetchAllCeldas();
  }, [initialMatrices, getCeldasAction]);

  useEffect(() => {
    setMatrices(initialMatrices);
    setEfectos(initialEfectos);
  }, [initialMatrices, initialEfectos]);

  const handleCeldaClick = (celdaId: number) => {
    const newSelection = new Set(selectedCeldas);
    if (newSelection.has(celdaId)) newSelection.delete(celdaId);
    else newSelection.add(celdaId);
    setSelectedCeldas(newSelection);
  };

  // --- ¡FUNCIÓN CORREGIDA CON MANEJO DE ERRORES! ---
  const handleApplyLetra = () => {
    if (selectedCeldas.size !== 1 || !letra.trim()) return;
    const celdaId = Array.from(selectedCeldas)[0];

    startTransition(async () => {
      // 1. Llama a la acción del servidor y espera el resultado.
      const result = await applyLetraAction(celdaId, letra);

      // 2. Comprueba si la acción del servidor devolvió un error.
      if (result && result.error) {
        // 3. Si hay un error, muéstralo en una alerta y detén la ejecución.
        alert(`Error al aplicar la letra: ${result.error}`);
        return;
      }

      // Si no hubo error, continúa con la actualización de la interfaz.
      const celdaAfectada = Object.values(celdasPorMatriz)
        .flat()
        .find((c) => c.id === celdaId);
      if (celdaAfectada) {
        const updatedCeldas = await getCeldasAction(celdaAfectada.matriz_id);
        if (updatedCeldas) {
          setCeldasPorMatriz((prev) => ({
            ...prev,
            [celdaAfectada.matriz_id]: updatedCeldas,
          }));
        }
      }
      setSelectedCeldas(new Set());
      setLetra("");
    });
  };

  const handleApplyEfecto = () => {
    if (selectedCeldas.size === 0 || !selectedEfectoId) return;
    const efectoId =
      selectedEfectoId === "ninguno" ? null : Number(selectedEfectoId);
    startTransition(async () => {
      await applyEfectoAction(Array.from(selectedCeldas), efectoId);
      const matricesAfectadasIds = new Set(
        Object.values(celdasPorMatriz)
          .flat()
          .filter((c) => selectedCeldas.has(c.id))
          .map((c) => c.matriz_id)
      );
      const newCeldasState = { ...celdasPorMatriz };
      for (const id of matricesAfectadasIds) {
        const updatedCeldas = await getCeldasAction(id);
        if (updatedCeldas) newCeldasState[id] = updatedCeldas;
      }
      setCeldasPorMatriz(newCeldasState);
      setSelectedCeldas(new Set());
    });
  };

  const handleLiberar = () => {
    if (selectedCeldas.size === 0) return;
    startTransition(async () => {
      await liberarCeldasAction(Array.from(selectedCeldas));
      const matricesAfectadasIds = new Set(
        Object.values(celdasPorMatriz)
          .flat()
          .filter((c) => selectedCeldas.has(c.id))
          .map((c) => c.matriz_id)
      );
      const newCeldasState = { ...celdasPorMatriz };
      for (const id of matricesAfectadasIds) {
        const updatedCeldas = await getCeldasAction(id);
        if (updatedCeldas) newCeldasState[id] = updatedCeldas;
      }
      setCeldasPorMatriz(newCeldasState);
      setSelectedCeldas(new Set());
    });
  };

  const handleSyncEfectos = () => {
    startTransition(async () => {
      const result = await syncEfectosAction();
      if (result.success) alert(result.message);
      else if (result.error) alert(`Error: ${result.error}`);
    });
  };

  const isLetraButtonDisabled = () => {
    if (isPending || selectedCeldas.size !== 1 || !letra.trim()) return true;
    const celdaId = Array.from(selectedCeldas)[0];
    const celda = Object.values(celdasPorMatriz)
      .flat()
      .find((c) => c.id === celdaId);
    return !celda || celda.estado_celda !== 1;
  };

  return (
    <div className="dashboard">
      <h1>Dashboard de Administrador</h1>
      <div className="panels">
        <div className="panel-gestion">
          <section>
            <h2>Gestión de Matrices</h2>
            <form action={createMatrizAction}>
              <input name="nombre" placeholder="Nombre de la Matriz" required />
              <input name="filas" type="number" placeholder="Filas" required />
              <input
                name="columnas"
                type="number"
                placeholder="Columnas"
                required
              />
              <button type="submit">Crear Matriz</button>
            </form>
          </section>
          <section>
            <h2>Gestión de Efectos</h2>
            <p>
              Añade nuevos efectos en <code>efectos.css</code> y sincronízalos.
            </p>
            <button onClick={handleSyncEfectos} disabled={isPending}>
              Sincronizar Efectos Predeterminados
            </button>
          </section>
        </div>
        <div className="panel-control">
          <section>
            <h2>Control de Efectos Globales</h2>
            <div className="global-controls">
              {efectos.map((e) => (
                <button
                  key={e.id}
                  onClick={() =>
                    startTransition(() => applyGlobalEfectoAction(e.nombre_css))
                  }
                >
                  {e.nombre}
                </button>
              ))}
              <button
                onClick={() =>
                  startTransition(() => applyGlobalEfectoAction("inicial"))
                }
              >
                Resetear Global
              </button>
            </div>
          </section>
          <section className="matriz-controls">
            <h2>Control por Celda</h2>
            <div className="control-group">
              <select
                onChange={(e) => setSelectedEfectoId(e.target.value)}
                value={selectedEfectoId}
              >
                <option disabled value="">
                  Selecciona un efecto
                </option>
                <option value="ninguno">Ninguno (Resetear)</option>
                {efectos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyEfecto}
                disabled={isPending || selectedCeldas.size === 0}
              >
                Aplicar a {selectedCeldas.size} celdas
              </button>
            </div>
            <div className="control-group">
              <button
                onClick={handleLiberar}
                disabled={isPending || selectedCeldas.size === 0}
              >
                Liberar {selectedCeldas.size} celdas
              </button>
            </div>
            <div className="control-group-letra">
              <h3>Efecto de Letra (solo 1 celda ocupada)</h3>
              <input
                type="text"
                placeholder="Escribe una letra"
                maxLength={1}
                value={letra}
                onChange={(e) => setLetra(e.target.value)}
              />
              <button
                onClick={handleApplyLetra}
                disabled={isLetraButtonDisabled()}
              >
                Mostrar Letra
              </button>
            </div>
          </section>
        </div>
      </div>
      <div className="todas-las-matrices">
        {matrices.map((matriz) => {
          const celdasDeEstaMatriz = celdasPorMatriz[matriz.id] || [];
          return (
            <div className="matriz-container" key={matriz.id}>
              <h3>{matriz.nombre}</h3>
              <div
                className="matriz-grid"
                style={{
                  gridTemplateColumns: `repeat(${matriz.columnas}, 1fr)`,
                }}
              >
                {celdasDeEstaMatriz.map((celda) => {
                  const efectoAplicado = efectos.find(
                    (e) => e.id === celda.efecto_id
                  );
                  return (
                    <div
                      key={celda.id}
                      className={`celda ${
                        celda.estado_celda === 1 ? "ocupada" : "libre"
                      } ${selectedCeldas.has(celda.id) ? "seleccionada" : ""} ${
                        efectoAplicado
                          ? `efecto-${efectoAplicado.nombre_css}`
                          : ""
                      }`}
                      onClick={() => handleCeldaClick(celda.id)}
                      title={`Fila: ${celda.fila}, Col: ${celda.columna}`}
                    >
                      {celda.letra_asignada && (
                        <span>{celda.letra_asignada}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
