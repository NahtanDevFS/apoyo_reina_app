// app/efectos/page.tsx
"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useSocket } from "@/lib/useSocket";
import "./efectos.css";

// Tipos
type Celda = {
  id: number;
  fila: number;
  columna: number;
  estado_celda: number;
};
type Matriz = { id: number; nombre: string; filas: number; columnas: number };

export default function EfectoPage() {
  const socket = useSocket();
  const [allMatrices, setAllMatrices] = useState<Matriz[]>([]);
  const [selectedMatriz, setSelectedMatriz] = useState<Matriz | null>(null);
  const [celdas, setCeldas] = useState<Celda[]>([]);
  const [celdaId, setCeldaId] = useState<number | null>(null);
  const [miCeldaInfo, setMiCeldaInfo] = useState<{
    fila: number;
    columna: number;
  } | null>(null);
  const [efecto, setEfecto] = useState<string>("inicial");
  const [efectoGlobal, setEfectoGlobal] = useState<string>("inicial");
  const [letra, setLetra] = useState<string | null>(null);
  const [waveState, setWaveState] = useState<{
    column: number | null;
    color: string | null;
  }>({ column: null, color: null });
  const [mensaje, setMensaje] = useState("Cargando eventos...");
  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- ¡NUEVO! --- Ref para guardar el objeto del Wake Lock
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [isPending, startTransition] = useTransition();

  const getNombreEfecto = async (efectoId: number | null): Promise<string> => {
    if (!efectoId) return "inicial";
    const { data, error } = await supabase
      .from("efectos")
      .select("nombre_css")
      .eq("id", efectoId)
      .single();
    if (error || !data) return "inicial";
    return data.nombre_css;
  };

  const seleccionarCelda = async (celda: Celda) => {
    if (celda.estado_celda === 1)
      return alert("Esta posición ya está ocupada.");
    startTransition(async () => {
      const { data, error } = await supabase.rpc("ocupar_celda_especifica", {
        matriz_id_in: selectedMatriz!.id,
        fila_in: celda.fila,
        columna_in: celda.columna,
      });
      if (error || !data || data.length === 0) {
        if (selectedMatriz) cargarCeldasDeMatriz(selectedMatriz);
        return alert("Alguien más tomó este lugar. ¡Intenta de nuevo!");
      }
      const nuevaCeldaId = data[0].celda_id;
      if (nuevaCeldaId) {
        setCeldaId(nuevaCeldaId);
        setMiCeldaInfo({ fila: celda.fila, columna: celda.columna });
        sessionStorage.setItem("miCeldaId", nuevaCeldaId.toString());
        sessionStorage.setItem(
          "miCeldaInfo",
          JSON.stringify({ fila: celda.fila, columna: celda.columna })
        );
        const { data: celdaInicial } = await supabase
          .from("celdas")
          .select("efecto_id, letra_asignada")
          .eq("id", nuevaCeldaId)
          .single();
        if (celdaInicial) {
          setEfecto(await getNombreEfecto(celdaInicial.efecto_id));
          setLetra(celdaInicial.letra_asignada);
        }
      }
    });
  };

  const liberarMiCelda = async () => {
    if (!celdaId) return;
    startTransition(async () => {
      await supabase.rpc("liberar_celda", { celda_id_in: celdaId });
      sessionStorage.removeItem("miCeldaId");
      sessionStorage.removeItem("miCeldaInfo");
      setCeldaId(null);
      setMiCeldaInfo(null);
      setIsUiVisible(true);
      setLetra(null);
      cargarTodasLasMatrices();
    });
  };

  const cargarTodasLasMatrices = async () => {
    setMensaje("Cargando eventos disponibles...");
    setSelectedMatriz(null);
    const { data, error } = await supabase
      .from("matrices")
      .select("*")
      .order("nombre");
    if (error)
      return setMensaje(
        "No se pudieron cargar los eventos. Revisa los permisos de la tabla."
      );
    setAllMatrices(data);
    setMensaje("Selecciona tu evento o sección");
  };

  const cargarCeldasDeMatriz = async (matriz: Matriz) => {
    setMensaje(`Cargando posiciones para ${matriz.nombre}...`);
    setSelectedMatriz(matriz);
    const { data: celdasData, error: celdasError } = await supabase
      .from("celdas")
      .select("id, fila, columna, estado_celda")
      .eq("matriz_id", matriz.id)
      .order("fila, columna");
    if (celdasError) return setMensaje("No se pudieron cargar las posiciones.");
    setCeldas(celdasData);
    setMensaje(`Elige tu posición en ${matriz.nombre}`);
  };

  const handleScreenTap = () => {
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    setIsUiVisible(true);
    uiTimeoutRef.current = setTimeout(() => setIsUiVisible(false), 2000);
  };

  // --- useEffects ---
  useEffect(() => {
    const idGuardado = sessionStorage.getItem("miCeldaId");
    const infoGuardada = sessionStorage.getItem("miCeldaInfo");
    if (idGuardado && infoGuardada) {
      setCeldaId(Number(idGuardado));
      setMiCeldaInfo(JSON.parse(infoGuardada));
      setIsUiVisible(false);
    } else {
      cargarTodasLasMatrices();
    }
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, []);

  // --- ¡NUEVO! --- useEffect para manejar el Screen Wake Lock
  useEffect(() => {
    // Función para solicitar el bloqueo de pantalla
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          console.log("Screen Wake Lock activado.");
        } catch (err: any) {
          console.error(`${err.name}, ${err.message}`);
        }
      } else {
        console.warn("Screen Wake Lock API no es soportada en este navegador.");
      }
    };

    // Si el usuario tiene una celda asignada, activamos el bloqueo
    if (celdaId) {
      requestWakeLock();
    }

    // Función de limpieza: se ejecuta cuando el usuario sale de la celda
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
          console.log("Screen Wake Lock liberado.");
        });
      }
    };
  }, [celdaId]);

  useEffect(() => {
    if (!socket || !selectedMatriz) return;
    socket.emit("join-matrix-room", selectedMatriz.id);
    const handleWaveUpdate = ({
      highlightedColumn,
      color,
    }: {
      highlightedColumn: number | null;
      color: string | null;
    }) => {
      setWaveState({ column: highlightedColumn, color: color });
    };
    socket.on("wave-update", handleWaveUpdate);
    return () => {
      socket.off("wave-update", handleWaveUpdate);
    };
  }, [socket, selectedMatriz]);

  useEffect(() => {
    if (!celdaId) return;
    const findAndSetMatriz = async () => {
      const { data } = await supabase
        .from("celdas")
        .select("matriz_id")
        .eq("id", celdaId)
        .single();
      if (data) {
        const { data: matrizData } = await supabase
          .from("matrices")
          .select("*")
          .eq("id", data.matriz_id)
          .single();
        if (matrizData) setSelectedMatriz(matrizData);
      }
    };
    findAndSetMatriz();

    const verificarEstado = async () => {
      const { data: miCeldaData, error: miCeldaError } = await supabase
        .from("celdas")
        .select("estado_celda, efecto_id, letra_asignada")
        .eq("id", celdaId)
        .single();
      if (miCeldaError || !miCeldaData) return liberarMiCelda();
      if (miCeldaData.estado_celda === 0) return liberarMiCelda();
      setLetra(miCeldaData.letra_asignada);
      const nombreEfectoNuevo = await getNombreEfecto(miCeldaData.efecto_id);
      if (nombreEfectoNuevo !== efecto) setEfecto(nombreEfectoNuevo);
      const { data: globalData } = await supabase
        .from("estado_concierto")
        .select("efecto_actual")
        .eq("id", 1)
        .single();
      if (globalData && globalData.efecto_actual !== efectoGlobal)
        setEfectoGlobal(globalData.efecto_actual);
    };
    const intervalId = setInterval(verificarEstado, 3000);
    verificarEstado();
    return () => clearInterval(intervalId);
  }, [celdaId]);

  const claseEfecto =
    efectoGlobal && efectoGlobal !== "inicial"
      ? `efecto-${efectoGlobal}`
      : `efecto-${efecto}`;

  // --- Lógica de Renderizado ---
  if (celdaId) {
    const isWaveActiveOnMe = miCeldaInfo?.columna === waveState.column;
    let finalClaseEfecto = claseEfecto;
    let inlineStyle = {};

    if (isWaveActiveOnMe) {
      finalClaseEfecto = "efecto-ola-activa";
      inlineStyle = { backgroundColor: waveState.color || undefined };
    }

    if (finalClaseEfecto === "efecto-mostrar-letra" && letra) {
      return (
        <div className={`container-letra ${finalClaseEfecto}`}>
          <span className="letra-display">{letra}</span>
        </div>
      );
    }

    const showUi = isUiVisible;

    return (
      <div
        className={`container-confirmacion ${finalClaseEfecto}`}
        style={inlineStyle}
        onClick={handleScreenTap}
      >
        <div className={`info-container ${showUi ? "visible" : ""}`}>
          <h1>¡Listo!</h1>
          <p>Tu posición está confirmada.</p>
          <div className="luz-indicadora"></div>
        </div>
        <button
          onClick={liberarMiCelda}
          disabled={isPending}
          className={`boton-salir ${showUi ? "visible" : ""}`}
        >
          Salir
        </button>
      </div>
    );
  }

  if (selectedMatriz) {
    return (
      <div className="container-seleccion">
        <button onClick={cargarTodasLasMatrices} className="boton-volver">
          ← Volver
        </button>
        <h1>{selectedMatriz.nombre}</h1>
        <p>{mensaje}</p>
        <div
          className="matriz-grid-seleccion"
          style={{
            gridTemplateColumns: `repeat(${selectedMatriz.columnas}, 1fr)`,
          }}
        >
          {celdas.map((celda) => {
            const isHighlighted = celda.columna === waveState.column;
            return (
              <button
                key={celda.id}
                className={`celda-seleccion ${
                  celda.estado_celda === 1 ? "ocupada" : "libre"
                } ${isHighlighted ? "wave-active" : ""}`}
                style={
                  isHighlighted && waveState.color
                    ? {
                        backgroundColor: waveState.color,
                        borderColor: waveState.color,
                      }
                    : {}
                }
                onClick={() => seleccionarCelda(celda)}
                disabled={isPending || celda.estado_celda === 1}
                title={`Fila ${celda.fila}, Columna ${celda.columna}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="container-seleccion">
      <h1>Eventos Disponibles</h1>
      <p>{mensaje}</p>
      <div className="lista-matrices">
        {allMatrices.map((matriz) => (
          <button
            key={matriz.id}
            onClick={() => cargarCeldasDeMatriz(matriz)}
            className="boton-matriz"
          >
            {matriz.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
