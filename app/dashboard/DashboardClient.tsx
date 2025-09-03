// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useEffect, useTransition, FormEvent } from "react";
import "./Dashboard.css";
// Importamos las nuevas acciones del servidor
import { advanceWaveEffect, stopWaveEffect } from "./actions";

import MatrixSelectionPanel from "./MatrixSelectionPanel";
import InteractiveGrid from "./InteractiveGrid";
import ControlPanel from "./ControlPanel";

// Tipos y Props (sin cambios)
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [matrices, setMatrices] = useState(initialMatrices);
  const [efectos, setEfectos] = useState(initialEfectos);
  const [celdasPorMatriz, setCeldasPorMatriz] = useState<
    Record<number, Celda[]>
  >({});
  const [selectedMatrizId, setSelectedMatrizId] = useState<number | null>(
    initialMatrices[0]?.id || null
  );
  const [selectedCeldas, setSelectedCeldas] = useState<Set<number>>(new Set());
  const [selectedEfectoId, setSelectedEfectoId] = useState<string>("");
  const [letra, setLetra] = useState("");
  const [isPending, startTransition] = useTransition();

  // --- ¡NUEVO! Estados para controlar el intervalo de la ola ---
  const [waveIntervalId, setWaveIntervalId] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isWaveActive, setIsWaveActive] = useState(false);

  useEffect(() => {
    const storedPassword = localStorage.getItem("dashboard_auth_key");
    if (storedPassword === "harvard$1234") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    setMatrices(initialMatrices);
    setEfectos(initialEfectos);
    if (!selectedMatrizId && initialMatrices.length > 0) {
      setSelectedMatrizId(initialMatrices[0].id);
    }
  }, [initialMatrices, initialEfectos, selectedMatrizId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedMatrizId) return;
    const refreshCeldas = async () => {
      const updatedCeldas = await getCeldasAction(selectedMatrizId);
      if (updatedCeldas) {
        setCeldasPorMatriz((prev) => ({
          ...prev,
          [selectedMatrizId]: updatedCeldas,
        }));
      }
    };
    refreshCeldas();
    const intervalId = setInterval(refreshCeldas, 5000);
    return () => clearInterval(intervalId);
  }, [selectedMatrizId, getCeldasAction, isAuthenticated]);

  const handleAuth = (e: FormEvent) => {
    e.preventDefault();
    if (passwordInput === "harvard$1234") {
      localStorage.setItem("dashboard_auth_key", "harvard$1234");
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Contraseña incorrecta. Inténtalo de nuevo.");
      setPasswordInput("");
    }
  };

  const handleStopWaveEffect = () => {
    if (waveIntervalId) {
      clearInterval(waveIntervalId);
    }
    setWaveIntervalId(null);
    setIsWaveActive(false);
    startTransition(() => {
      stopWaveEffect();
    });
  };

  const handleStartWaveEffect = () => {
    if (!selectedMatrizId) return;
    const matrizActual = matrices.find((m) => m.id === selectedMatrizId);
    if (!matrizActual) return;

    handleStopWaveEffect(); // Limpia cualquier intervalo anterior

    let column = 0;
    const interval = setInterval(() => {
      startTransition(() => {
        advanceWaveEffect(column, matrizActual.columnas);
      });
      column = (column + 1) % matrizActual.columnas;
    }, 250);

    setWaveIntervalId(interval);
    setIsWaveActive(true);
  };

  const handleApplyGlobalEfecto = (css: string) => {
    handleStopWaveEffect(); // Detiene la ola si se selecciona otro efecto
    startTransition(() => applyGlobalEfectoAction(css));
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-overlay">
        <div className="auth-container">
          <form onSubmit={handleAuth}>
            <h2>Acceso al Dashboard</h2>
            <p>Por favor, ingresa la contraseña para continuar.</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Contraseña"
              autoFocus
            />
            <button type="submit">Entrar</button>
            {authError && <p className="auth-error">{authError}</p>}
          </form>
        </div>
      </div>
    );
  }

  const handleSelectMatriz = (id: number) => {
    setSelectedMatrizId(id);
    setSelectedCeldas(new Set());
  };

  const handleCeldaClick = (celdaId: number) => {
    const newSelection = new Set(selectedCeldas);
    if (newSelection.has(celdaId)) newSelection.delete(celdaId);
    else newSelection.add(celdaId);
    setSelectedCeldas(newSelection);
  };

  const refreshCurrentMatrix = async () => {
    if (selectedMatrizId) {
      const updatedCeldas = await getCeldasAction(selectedMatrizId);
      if (updatedCeldas) {
        setCeldasPorMatriz((prev) => ({
          ...prev,
          [selectedMatrizId]: updatedCeldas,
        }));
      }
    }
  };

  const handleApplyLetra = () => {
    if (selectedCeldas.size !== 1 || !letra.trim()) return;
    const celdaId = Array.from(selectedCeldas)[0];
    startTransition(async () => {
      const result = await applyLetraAction(celdaId, letra);
      if (result?.error) return alert(`Error: ${result.error}`);
      await refreshCurrentMatrix();
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
      await refreshCurrentMatrix();
      setSelectedCeldas(new Set());
    });
  };

  const handleLiberar = () => {
    if (selectedCeldas.size === 0) return;
    startTransition(async () => {
      await liberarCeldasAction(Array.from(selectedCeldas));
      await refreshCurrentMatrix();
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
    const celda = celdasPorMatriz[selectedMatrizId!]?.find(
      (c) => c.id === celdaId
    );
    return !celda || celda.estado_celda !== 1;
  };

  const matrizActual = matrices.find((m) => m.id === selectedMatrizId);
  const celdasActuales = celdasPorMatriz[selectedMatrizId!] || [];

  return (
    <div className="dashboard-layout">
      <div className="dashboard-column left-column">
        <MatrixSelectionPanel
          matrices={matrices}
          selectedMatrizId={selectedMatrizId}
          onSelectMatriz={handleSelectMatriz}
          createMatrizAction={createMatrizAction}
          syncEfectosAction={handleSyncEfectos}
        />
      </div>
      <div className="dashboard-column center-column">
        <InteractiveGrid
          matriz={matrizActual}
          celdas={celdasActuales}
          efectos={efectos}
          selectedCeldas={selectedCeldas}
          onCeldaClick={handleCeldaClick}
        />
      </div>
      <div className="dashboard-column right-column">
        <ControlPanel
          efectos={efectos}
          selectedCeldasCount={selectedCeldas.size}
          letra={letra}
          onLetraChange={setLetra}
          selectedEfectoId={selectedEfectoId}
          onEfectoChange={setSelectedEfectoId}
          onApplyEfecto={handleApplyEfecto}
          onApplyLetra={handleApplyLetra}
          onLiberar={handleLiberar}
          onApplyGlobalEfecto={handleApplyGlobalEfecto}
          onStartWaveEffect={handleStartWaveEffect}
          onStopWaveEffect={handleStopWaveEffect}
          isWaveActive={isWaveActive}
          isLetraButtonDisabled={isLetraButtonDisabled()}
          isWaveButtonDisabled={!selectedMatrizId}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
