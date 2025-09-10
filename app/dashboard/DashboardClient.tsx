// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useEffect, useTransition, FormEvent } from "react";
import "./Dashboard.css";
import MatrixSelectionPanel from "./MatrixSelectionPanel";
import InteractiveGrid from "./InteractiveGrid";
import ControlPanel from "./ControlPanel";

// Tipos y Props
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
type ParpadeoConfig = { colors: string[]; speed: number };
type FlashConfig = { speed: number }; // ¡NUEVO!

type DashboardClientProps = {
  initialMatrices: Matriz[];
  initialEfectos: Efecto[];
  initialParpadeoConfig: ParpadeoConfig;
  initialFlashConfig: FlashConfig; // ¡NUEVO!
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
  liberarMatrizAction: (matrizId: number) => Promise<any>;
  applyTextoToMatrizAction: (matrizId: number, texto: string) => Promise<any>;
  applyParpadeoPersonalizadoAction: (
    colors: string[],
    speed: number
  ) => Promise<any>;
  applyFlashFisicoAction: (speed: number) => Promise<any>; // ¡NUEVO!
};

export default function DashboardClient({
  initialMatrices,
  initialEfectos,
  initialParpadeoConfig,
  initialFlashConfig,
  getCeldasAction,
  createMatrizAction,
  syncEfectosAction,
  applyEfectoAction,
  applyGlobalEfectoAction,
  liberarCeldasAction,
  applyLetraAction,
  liberarMatrizAction,
  applyTextoToMatrizAction,
  applyParpadeoPersonalizadoAction,
  applyFlashFisicoAction,
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
  const [textoGlobal, setTextoGlobal] = useState("");
  const [isPending, startTransition] = useTransition();
  const [waveIntervalId, setWaveIntervalId] = useState<NodeJS.Timeout | null>(
    null
  );

  const [parpadeoColors, setParpadeoColors] = useState<string[]>(
    initialParpadeoConfig.colors
  );
  const [parpadeoSpeed, setParpadeoSpeed] = useState<number>(
    initialParpadeoConfig.speed
  );
  const [flashSpeed, setFlashSpeed] = useState<number>(
    initialFlashConfig.speed
  ); // ¡NUEVO!

  useEffect(() => {
    const storedPassword = localStorage.getItem("dashboard_auth_key");
    if (storedPassword === "harvard$1234") setIsAuthenticated(true);
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
    const intervalId = setInterval(refreshCeldas, 2000);
    return () => clearInterval(intervalId);
  }, [selectedMatrizId, getCeldasAction, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (waveIntervalId) clearInterval(waveIntervalId);
    };
  }, [waveIntervalId, selectedMatrizId]);

  const handleAuth = (e: FormEvent) => {
    e.preventDefault();
    if (passwordInput === "harvard$1234") {
      localStorage.setItem("dashboard_auth_key", "harvard$1234");
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Contraseña incorrecta.");
      setPasswordInput("");
    }
  };

  const handleSelectMatriz = (id: number) => {
    stopWave();
    setSelectedMatrizId(id);
    setSelectedCeldas(new Set());
  };

  const handleCeldaClick = (celdaId: number) => {
    const newSelection = new Set(selectedCeldas);
    newSelection.has(celdaId)
      ? newSelection.delete(celdaId)
      : newSelection.add(celdaId);
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
      await applyLetraAction(celdaId, letra);
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
      alert(result.message || result.error);
    });
  };

  const handleLiberarMatriz = () => {
    if (
      !selectedMatrizId ||
      !confirm("¿Seguro que quieres liberar TODAS las celdas de esta matriz?")
    )
      return;
    startTransition(async () => {
      await liberarMatrizAction(selectedMatrizId);
      await refreshCurrentMatrix();
      setSelectedCeldas(new Set());
    });
  };

  const handleApplyTextoToMatriz = () => {
    if (!selectedMatrizId || !textoGlobal.trim()) return;
    startTransition(async () => {
      await applyTextoToMatrizAction(selectedMatrizId, textoGlobal);
      await refreshCurrentMatrix();
      setTextoGlobal("");
    });
  };

  const handleApplyParpadeo = () => {
    if (parpadeoColors.length < 2) {
      alert("Necesitas al menos 2 colores para el efecto de parpadeo.");
      return;
    }
    startTransition(async () => {
      await applyParpadeoPersonalizadoAction(parpadeoColors, parpadeoSpeed);
    });
  };

  // ¡NUEVO! Handler para aplicar flash físico
  const handleApplyFlash = () => {
    startTransition(async () => {
      await applyFlashFisicoAction(flashSpeed);
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

  const stopWave = async () => {
    if (waveIntervalId) {
      clearInterval(waveIntervalId);
      setWaveIntervalId(null);
    }
    if (selectedMatrizId) {
      const celdasToClear =
        celdasPorMatriz[selectedMatrizId!]?.map((c) => c.id) || [];
      if (celdasToClear.length > 0) {
        await applyEfectoAction(celdasToClear, null);
        await refreshCurrentMatrix();
      }
    }
  };

  const startWave = (waveType: string) => {
    if (waveIntervalId) clearInterval(waveIntervalId);
    if (!selectedMatrizId) return;

    const matriz = matrices.find((m) => m.id === selectedMatrizId);
    if (!matriz) return;

    const celdas = celdasPorMatriz[selectedMatrizId] || [];
    const efectoActivo = efectos.find((e) => e.nombre_css === "ola-activa");
    if (!efectoActivo) return;

    let step = 0;
    const interval = setInterval(() => {
      startTransition(async () => {
        let celdasParaActivarIds: number[] = [];
        let celdasParaDesactivarIds: number[] = [];

        if (waveType === "ola-horizontal") {
          const totalSteps = matriz.columnas;
          const currentColumn = step % totalSteps;
          const prevColumn = (step - 1 + totalSteps) % totalSteps;
          celdasParaActivarIds = celdas
            .filter((c) => c.columna === currentColumn)
            .map((c) => c.id);
          celdasParaDesactivarIds = celdas
            .filter((c) => c.columna === prevColumn)
            .map((c) => c.id);
        } else if (waveType === "ola-vertical") {
          const totalSteps = matriz.filas;
          const currentRow = step % totalSteps;
          const prevRow = (step - 1 + totalSteps) % totalSteps;
          celdasParaActivarIds = celdas
            .filter((c) => c.fila === currentRow)
            .map((c) => c.id);
          celdasParaDesactivarIds = celdas
            .filter((c) => c.fila === prevRow)
            .map((c) => c.id);
        } else if (waveType === "ola-expansiva") {
          const centerX = Math.floor(matriz.columnas / 2);
          const centerY = Math.floor(matriz.filas / 2);
          const maxDist = Math.max(
            centerX,
            centerY,
            matriz.columnas - centerX,
            matriz.filas - centerY
          );
          const totalSteps = maxDist + 2;
          const currentRing = step % totalSteps;

          if (currentRing <= maxDist) {
            celdasParaActivarIds = celdas
              .filter(
                (c) =>
                  Math.max(
                    Math.abs(c.columna - centerX),
                    Math.abs(c.fila - centerY)
                  ) === currentRing
              )
              .map((c) => c.id);
          }
          celdasParaDesactivarIds = celdas
            .filter(
              (c) =>
                Math.max(
                  Math.abs(c.columna - centerX),
                  Math.abs(c.fila - centerY)
                ) ===
                currentRing - 1
            )
            .map((c) => c.id);
        }

        step++;

        if (celdasParaActivarIds.length > 0)
          await applyEfectoAction(celdasParaActivarIds, efectoActivo.id);
        if (celdasParaDesactivarIds.length > 0)
          await applyEfectoAction(celdasParaDesactivarIds, null);
      });
    }, 400);

    setWaveIntervalId(interval);
  };

  const handleApplyGlobalEfecto = async (efectoCss: string) => {
    await stopWave();

    if (efectoCss.startsWith("ola-")) {
      startTransition(() => applyGlobalEfectoAction(efectoCss));
      startWave(efectoCss);
    } else {
      startTransition(() => applyGlobalEfectoAction(efectoCss));
    }
  };

  const matrizActual = matrices.find((m) => m.id === selectedMatrizId);
  const celdasActuales = celdasPorMatriz[selectedMatrizId!] || [];

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
          textoGlobal={textoGlobal}
          onTextoGlobalChange={setTextoGlobal}
          selectedEfectoId={selectedEfectoId}
          onEfectoChange={setSelectedEfectoId}
          onApplyEfecto={handleApplyEfecto}
          onApplyLetra={handleApplyLetra}
          onLiberar={handleLiberar}
          onLiberarMatriz={handleLiberarMatriz}
          onApplyTextoToMatriz={handleApplyTextoToMatriz}
          onApplyGlobalEfecto={handleApplyGlobalEfecto}
          isLetraButtonDisabled={isLetraButtonDisabled()}
          isPending={isPending}
          parpadeoColors={parpadeoColors}
          setParpadeoColors={setParpadeoColors}
          parpadeoSpeed={parpadeoSpeed}
          setParpadeoSpeed={setParpadeoSpeed}
          onApplyParpadeo={handleApplyParpadeo}
          flashSpeed={flashSpeed} // ¡NUEVO!
          setFlashSpeed={setFlashSpeed} // ¡NUEVO!
          onApplyFlash={handleApplyFlash} // ¡NUEVO!
        />
      </div>
    </div>
  );
}
