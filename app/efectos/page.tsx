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

  // --- ¡NUEVO! Refs para manejar el flash físico ---
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const prevEfectoRef = useRef<string>("inicial");

  // --- ¡NUEVO! Función para controlar el flash (torch) ---
  const controlFlash = async (state: boolean) => {
    if (
      videoTrackRef.current &&
      (videoTrackRef.current.getCapabilities() as any).torch
    ) {
      try {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: state }] as any,
        });
      } catch (err) {
        console.error("Error al controlar el flash:", err);
      }
    }
  };

  // --- ¡NUEVO! Función para detener cualquier patrón de flasheo ---
  const stopFlashing = () => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    controlFlash(false); // Siempre apagar el flash al detener
  };

  // --- ¡NUEVO! Función para iniciar un patrón de flasheo ---
  const startFlashing = (flashType: string) => {
    stopFlashing(); // Detener cualquier flash anterior

    let pattern: number[] = []; // [on, off, on, off, ...]
    switch (flashType) {
      case "flash-fisico-lento":
        pattern = [1000, 1000]; // 1s on, 1s off
        break;
      case "flash-fisico-rapido":
        pattern = [200, 200]; // 0.2s on, 0.2s off
        break;
      case "flash-fisico-sos":
        pattern = [150, 100, 150, 100, 150, 400, 400, 100, 400, 100, 400, 400, 150, 100, 150, 100, 150, 800];
        break;
      default:
        return;
    }

    let i = 0;
    const executePattern = () => {
      controlFlash(i % 2 === 0); // Alternar on/off
      const duration = pattern[i % pattern.length];
      i++;
      flashIntervalRef.current = setTimeout(executePattern, duration);
    };

    executePattern();
  };

  // --- ¡NUEVO! Función para inicializar la cámara y obtener permisos ---
  const initCameraForFlash = async (): Promise<boolean> => {
    if (videoTrackRef.current) return true; // Ya está inicializada

    if (!("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices)) {
      alert("Tu navegador no soporta el control del flash.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Pedir cámara trasera
      });
      const track = stream.getVideoTracks()[0];
      // Usar type assertion para acceder a 'torch'
      if (!(track.getCapabilities() as any).torch) {
        alert("Tu dispositivo no parece tener un flash controlable.");
        track.stop(); // Liberar la cámara si no hay flash
        return false;
      }
      videoTrackRef.current = track;
      return true;
    } catch (err) {
      alert("Necesitamos permiso para usar la cámara y poder controlar el flash.");
      console.error("Error al obtener acceso a la cámara:", err);
      return false;
    }
  };
  
  // --- ¡NUEVO! Función para liberar la cámara y apagar el flash ---
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
      releaseCamera(); // ¡NUEVO! Asegurarse de liberar la cámara al salir.
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
          console.log("Screen Wake Lock activado.");
        } catch (err: any) {
          console.error(
            `No se pudo activar el Wake Lock: ${err.name}, ${err.message}`
          );
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("Screen Wake Lock liberado.");
      }
    };

    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
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
        // --- ¡NUEVA LÓGICA PARA EL FLASH FÍSICO! ---
        if (efectoActual.startsWith("flash-fisico-")) {
            const cameraReady = await initCameraForFlash();
            if (cameraReady) {
                startFlashing(efectoActual);
            }
        } 
        // Si el efecto anterior era de flash y el nuevo no, detenerlo.
        else if (prevEfectoRef.current.startsWith("flash-fisico-")) {
            stopFlashing();
        }
        prevEfectoRef.current = efectoActual;
    };

    const verificarEstado = async () => {
      // 1. Obtener efecto global
      const { data: globalData } = await supabase
        .from("estado_concierto")
        .select("efecto_actual")
        .eq("id", 1)
        .single();
      
      const efectoGlobalNuevo = globalData?.efecto_actual || "inicial";
      setEfectoGlobal(efectoGlobalNuevo);

      // 2. Obtener efecto de la celda
      const { data: miCeldaData } = await supabase
        .from("celdas")
        .select("estado_celda, efecto_id, letra_asignada")
        .eq("id", celdaId)
        .single();
      
      if (!miCeldaData || miCeldaData.estado_celda === 0) return liberarMiCelda();

      setLetra(miCeldaData.letra_asignada);
      const efectoCeldaNuevo = await getNombreEfecto(miCeldaData.efecto_id);
      setEfecto(efectoCeldaNuevo);
      
      // 3. Decidir qué efecto usar y actuar
      const efectoFinal = efectoGlobalNuevo !== 'inicial' ? efectoGlobalNuevo : efectoCeldaNuevo;
      
      if (efectoFinal !== prevEfectoRef.current) {
        handleEfectoChange(efectoFinal);
      }
    };

    const intervalId = setInterval(verificarEstado, 1000);
    verificarEstado();
    
    // Función de limpieza
    return () => {
      clearInterval(intervalId);
      releaseCamera(); // ¡NUEVO! Liberar cámara si el componente se desmonta.
    };
  }, [celdaId]);

  const efectoActual = efectoGlobal !== "inicial" ? `efecto-${efectoGlobal}` : `efecto-${efecto}`;
  
  // No mostrar efectos de pantalla si el flash físico está activo
  const claseEfecto = efectoActual.includes("flash-fisico-") ? "efecto-apagon" : efectoActual;

  if (celdaId) {
    if (claseEfecto === "efecto-mostrar-letra" && letra) {
      return (
        <div className={`container-letra ${claseEfecto}`}>
          <span className="letra-display">{letra}</span>
        </div>
      );
    }

    return (
      <div
        className={`container-confirmacion ${claseEfecto}`}
        onClick={handleScreenTap}
      >
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
          style={{
            gridTemplateColumns: `repeat(${selectedMatriz.columnas}, 1fr)`,
          }}
        >
          {celdas.map((celda) => (
            <button
              key={celda.id}
              className={`celda-seleccion ${
                celda.estado_celda === 1 ? "ocupada" : "libre"
              }`}
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