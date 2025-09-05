// app/efectos/page.tsx
"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
  const [mensaje, setMensaje] = useState("Cargando eventos...");
  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();

  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const prevEfectoRef = useRef<string>("inicial");

  // --- CORRECCIÓN: Función de control de flash mejorada ---
  const controlFlash = async (state: boolean) => {
    if (videoTrackRef.current && videoTrackRef.current.getCapabilities().torch) {
      try {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: state }],
        });
      } catch (err) {
        console.error("Error al controlar el flash:", err);
      }
    }
  };

  const stopFlashing = () => {
    if (flashIntervalRef.current) {
      clearTimeout(flashIntervalRef.current); // Usamos clearTimeout para los patrones
      flashIntervalRef.current = null;
    }
    controlFlash(false);
  };

  const startFlashing = (flashType: string) => {
    stopFlashing();

    let pattern: number[] = [];
    switch (flashType) {
      case "flash-fisico-lento":
        pattern = [1000, 1000];
        break;
      case "flash-fisico-rapido":
        pattern = [200, 200];
        break;
      case "flash-fisico-sos":
        pattern = [150, 100, 150, 100, 150, 400, 400, 100, 400, 100, 400, 400, 150, 100, 150, 100, 150, 800];
        break;
      default:
        return;
    }

    let i = 0;
    const executePattern = () => {
      controlFlash(i % 2 === 0);
      const duration = pattern[i % pattern.length];
      i++;
      flashIntervalRef.current = setTimeout(executePattern, duration);
    };
    executePattern();
  };
  
  // --- CORRECCIÓN: Se eliminan los 'alert()' para una experiencia fluida ---
  const initCameraForFlash = async (): Promise<boolean> => {
    if (videoTrackRef.current) return true;

    if (!("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices)) {
      console.error("Flash Control: MediaDevices API not supported.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      
      // Si no hay 'torch', lo reportamos en consola y devolvemos false sin alertar.
      if (!track.getCapabilities().torch) {
        console.error("Flash Control: Torch capability not supported on this device/track.");
        track.stop();
        return false;
      }
      videoTrackRef.current = track;
      return true;
    } catch (err) {
      // Si el usuario niega el permiso, no mostramos alerta.
      console.error("Flash Control: Could not get camera access (permission likely denied).", err);
      return false;
    }
  };

  const releaseCamera = () => {
    stopFlashing();
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
      console.log("Cámara liberada.");
    }
  };

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
    if (!selectedMatriz) return; // Guard para evitar errores
    
    startTransition(async () => {
      const { data, error } = await supabase.rpc("ocupar_celda_especifica", {
        matriz_id_in: selectedMatriz.id,
        fila_in: celda.fila,
        columna_in: celda.columna,
      });
      if (error || !data || data.length === 0) {
        cargarCeldasDeMatriz(selectedMatriz);
        return alert("Alguien más tomó este lugar. ¡Intenta de nuevo!");
      }
      const nuevaCeldaId = data[0].celda_id;
      if (nuevaCeldaId) {
        setCeldaId(nuevaCeldaId);
        setMiCeldaInfo({ fila: celda.fila, columna: celda.columna });
        sessionStorage.setItem("miCeldaId", nuevaCeldaId.toString());
        sessionStorage.setItem("miCeldaInfo", JSON.stringify({ fila: celda.fila, columna: celda.columna }));
      }
    });
  };

  const liberarMiCelda = async () => {
    if (!celdaId) return;
    startTransition(async () => {
      releaseCamera();
      await supabase.rpc("liberar_celda", { celda_id_in: celdaId });
      sessionStorage.removeItem("miCeldaId");
      sessionStorage.removeItem("miCeldaInfo");
      setCeldaId(null);
      setMiCeldaInfo(null);
      setIsUiVisible(true);
      setLetra(null);
      setEfecto("inicial");
      setEfectoGlobal("inicial");
      prevEfectoRef.current = "inicial";
      cargarTodasLasMatrices();
    });
  };

  const cargarTodasLasMatrices = async () => {
    setMensaje("Cargando eventos disponibles...");
    setSelectedMatriz(null);
    const { data, error } = await supabase.from("matrices").select("*").order("nombre");
    if (error) return setMensaje("No se pudieron cargar los eventos.");
    setAllMatrices(data);
    setMensaje("Selecciona tu evento o sección");
  };

  const cargarCeldasDeMatriz = async (matriz: Matriz) => {
    setMensaje(`Cargando posiciones para ${matriz.nombre}...`);
    setSelectedMatriz(matriz);
    const { data, error } = await supabase
      .from("celdas")
      .select("id, fila, columna, estado_celda")
      .eq("matriz_id", matriz.id)
      .order("fila, columna");
    if (error) return setMensaje("No se pudieron cargar las posiciones.");
    setCeldas(data);
    setMensaje(`Elige tu posición en ${matriz.nombre}`);
  };

  const handleScreenTap = () => {
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    setIsUiVisible(true);
    uiTimeoutRef.current = setTimeout(() => setIsUiVisible(false), 2000);
  };

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

  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && celdaId) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err: any) {
          console.error(`No se pudo activar el Wake Lock: ${err.name}, ${err.message}`);
        }
      }
    };
    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [celdaId]);

  useEffect(() => {
    if (!celdaId) return;

    const handleEfectoChange = async (efectoActual: string) => {
      if (efectoActual.startsWith("flash-fisico-")) {
        const cameraReady = await initCameraForFlash();
        if (cameraReady) startFlashing(efectoActual);
      } else if (prevEfectoRef.current.startsWith("flash-fisico-")) {
        stopFlashing();
      }
      prevEfectoRef.current = efectoActual;
    };

    const verificarEstado = async () => {
      if(!celdaId) return;
      const [globalRes, celdaRes] = await Promise.all([
          supabase.from("estado_concierto").select("efecto_actual").eq("id", 1).single(),
          supabase.from("celdas").select("estado_celda, efecto_id, letra_asignada").eq("id", celdaId).single()
      ]);

      if (!celdaRes.data || celdaRes.data.estado_celda === 0) return liberarMiCelda();
      
      const efectoGlobalNuevo = globalRes.data?.efecto_actual || "inicial";
      const efectoCeldaNuevo = await getNombreEfecto(celdaRes.data.efecto_id);
      
      setLetra(celdaRes.data.letra_asignada);
      setEfectoGlobal(efectoGlobalNuevo);
      setEfecto(efectoCeldaNuevo);
      
      const efectoFinal = efectoGlobalNuevo !== 'inicial' ? efectoGlobalNuevo : efectoCeldaNuevo;
      
      if (efectoFinal !== prevEfectoRef.current) {
        handleEfectoChange(efectoFinal);
      }
    };

    const intervalId = setInterval(verificarEstado, 1000);
    verificarEstado();
    
    return () => {
      clearInterval(intervalId);
      releaseCamera();
    };
  }, [celdaId]);

  const efectoActivo = efectoGlobal !== "inicial" ? efectoGlobal : efecto;
  const claseEfecto = `efecto-${efectoActivo}`;
  
  const claseFondo = efectoActivo.startsWith("flash-fisico-") ? "efecto-apagon" : claseEfecto;

  if (celdaId) {
    if (claseEfecto === "efecto-mostrar-letra" && letra) {
      return (
        <div className={`container-letra ${claseFondo}`}>
          <span className="letra-display">{letra}</span>
        </div>
      );
    }

    return (
      <div className={`container-confirmacion ${claseFondo}`} onClick={handleScreenTap}>
        <div className={`info-container ${isUiVisible ? "visible" : ""}`}>
          <h1>¡Listo!</h1>
          <p>Tu posición está confirmada.</p>
          <div className="luz-indicadora"></div>
        </div>
        <button
          onClick={liberarMiCelda}
          disabled={isPending}
          className={`boton-salir ${isUiVisible ? "visible" : ""}`}
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
          style={{ gridTemplateColumns: `repeat(${selectedMatriz.columnas}, 1fr)` }}
        >
          {celdas.map((celda) => (
            <button
              key={celda.id}
              className={`celda-seleccion ${celda.estado_celda === 1 ? "ocupada" : "libre"}`}
              onClick={() => seleccionarCelda(celda)}
              disabled={isPending || celda.estado_celda === 1}
              title={`Fila ${celda.fila}, Columna ${celda.columna}`}
            />
          ))}
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
          <button key={matriz.id} onClick={() => cargarCeldasDeMatriz(matriz)} className="boton-matriz">
            {matriz.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}