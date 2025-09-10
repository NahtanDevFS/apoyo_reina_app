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
  efecto_id: number | null;
  letra_asignada: string | null;
};
type Matriz = { id: number; nombre: string; filas: number; columnas: number };
type ParpadeoConfig = { colors: string[]; speed: number };
type FlashConfig = { speed: number };

export default function EfectoPage() {
  const [allMatrices, setAllMatrices] = useState<Matriz[]>([]);
  const [selectedMatriz, setSelectedMatriz] = useState<Matriz | null>(null);
  const [celdas, setCeldas] = useState<
    Pick<Celda, "id" | "fila" | "columna" | "estado_celda">[]
  >([]);
  const [celdaId, setCeldaId] = useState<number | null>(null);
  const [miCeldaInfo, setMiCeldaInfo] = useState<{
    fila: number;
    columna: number;
  } | null>(null);
  const [efecto, setEfecto] = useState<string>("inicial");
  const [letraMostrada, setLetraMostrada] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("Cargando eventos...");
  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();

  const [hasInteracted, setHasInteracted] = useState(false);

  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const prevEfectoRef = useRef<string>("inicial");
  const efectoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const styleSheetRef = useRef<CSSStyleSheet | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const SYNCHRONIZATION_DELAY_MS = 2000;

  const handleInteraction = () => {
    setHasInteracted(true);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
    }
    const idGuardado = sessionStorage.getItem("miCeldaId");
    const infoGuardada = sessionStorage.getItem("miCeldaInfo");
    if (idGuardado && infoGuardada) {
      setCeldaId(Number(idGuardado));
      setMiCeldaInfo(JSON.parse(infoGuardada));
      setIsUiVisible(false);
    } else {
      cargarTodasLasMatrices();
    }
  };

  const updateParpadeoAnimation = (config: ParpadeoConfig) => {
    if (!styleSheetRef.current) {
      const styleEl = document.createElement("style");
      document.head.appendChild(styleEl);
      styleSheetRef.current = styleEl.sheet;
    }

    if (styleSheetRef.current && styleSheetRef.current.cssRules.length > 0) {
      styleSheetRef.current.deleteRule(0);
      styleSheetRef.current.deleteRule(0);
    }

    if (config.colors && config.colors.length >= 2) {
      const keyframes = `
        @keyframes parpadeo-dinamico {
          ${config.colors
            .map((color, index) => {
              const step = 100 / config.colors.length;
              return `${index * step}%, ${
                (index + 1) * step - 0.01
              }% { background-color: ${color}; }`;
            })
            .join("\n")}
          100% { background-color: ${config.colors[0]}; }
        }
      `;
      const animationClass = `
        .efecto-parpadeo-personalizado, .efecto-combinado {
          animation: parpadeo-dinamico ${
            config.speed * config.colors.length
          }s infinite;
        }
      `;
      styleSheetRef.current?.insertRule(keyframes, 0);
      styleSheetRef.current?.insertRule(animationClass, 1);
    }
  };

  const scheduleEffect = (
    efecto: string,
    texto: string | null,
    timestamp: string,
    parpadeoConfig: ParpadeoConfig | null,
    flashConfig: FlashConfig | null,
    audioUrl: string | null
  ) => {
    if (efectoTimeoutRef.current) clearTimeout(efectoTimeoutRef.current);

    const serverTime = new Date(timestamp).getTime();
    const clientTime = new Date().getTime();
    const executionTime = serverTime + SYNCHRONIZATION_DELAY_MS;

    const delay = Math.max(0, executionTime - clientTime);

    efectoTimeoutRef.current = setTimeout(() => {
      if (
        (efecto === "parpadeo-personalizado" || efecto === "combinado") &&
        parpadeoConfig
      ) {
        updateParpadeoAnimation(parpadeoConfig);
      }

      if (
        (efecto === "reproducir-audio" || efecto === "combinado") &&
        audioUrl &&
        audioRef.current
      ) {
        const absoluteUrl = new URL(audioUrl, window.location.origin).href;
        if (audioRef.current.src !== absoluteUrl) {
          audioRef.current.src = absoluteUrl;
        }
        audioRef.current
          .play()
          .catch((e) => console.error("Error al reproducir audio:", e));
      } else if (audioRef.current) {
        audioRef.current.pause();
      }

      if (
        (efecto === "flash-fisico-regulable" || efecto === "combinado") &&
        flashConfig
      ) {
        initCameraForFlash().then((ready) => {
          if (ready) startFlashing(flashConfig.speed);
        });
      } else {
        stopFlashing();
      }

      setEfecto(efecto);
      if (efecto === "mostrar-letra" && texto) {
        startTextoLoop(texto);
      } else {
        stopTextoLoop();
      }
    }, delay);
  };

  const controlFlash = async (state: boolean) => {
    if (
      videoTrackRef.current &&
      (videoTrackRef.current.getCapabilities() as any).torch
    ) {
      try {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: state } as any],
        });
      } catch (err) {
        console.error("Error al controlar el flash:", err);
      }
    }
  };

  const stopFlashing = () => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    controlFlash(false);
  };

  const startFlashing = (speed: number) => {
    stopFlashing();
    const intervalTime = speed * 1000;
    let flashOn = false;
    const executeFlash = () => {
      flashOn = !flashOn;
      controlFlash(flashOn);
    };
    flashIntervalRef.current = setInterval(executeFlash, intervalTime / 2);
  };

  const initCameraForFlash = async (): Promise<boolean> => {
    if (videoTrackRef.current) return true;
    if (
      !("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices)
    ) {
      console.error("Flash Control: MediaDevices API not supported.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      if (!(track.getCapabilities() as any).torch) {
        console.error("Flash Control: Torch capability not supported.");
        track.stop();
        return false;
      }
      videoTrackRef.current = track;
      return true;
    } catch (err) {
      console.error("Flash Control: Could not get camera access.", err);
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

  const stopTextoLoop = () => {
    if (textoIntervalRef.current) {
      clearInterval(textoIntervalRef.current);
      textoIntervalRef.current = null;
    }
    setLetraMostrada(null);
  };

  const startTextoLoop = (texto: string) => {
    stopTextoLoop();
    if (!texto) return;
    if (texto.length <= 1) {
      setLetraMostrada(texto);
      return;
    }

    let index = 0;
    setLetraMostrada(texto[index]);
    index = (index + 1) % texto.length;

    textoIntervalRef.current = setInterval(() => {
      setLetraMostrada(texto[index]);
      index = (index + 1) % texto.length;
    }, 800);
  };

  const getNombreEfecto = async (efectoId: number | null): Promise<string> => {
    if (!efectoId) return "inicial";
    const { data, error } = await supabase
      .from("efectos")
      .select("nombre_css")
      .eq("id", efectoId)
      .single();
    return error || !data ? "inicial" : data.nombre_css;
  };

  const liberarMiCelda = async () => {
    if (!celdaId) return;
    startTransition(async () => {
      releaseCamera();
      stopTextoLoop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (efectoTimeoutRef.current) clearTimeout(efectoTimeoutRef.current);
      await supabase.rpc("liberar_celda", { celda_id_in: celdaId });
      sessionStorage.removeItem("miCeldaId");
      sessionStorage.removeItem("miCeldaInfo");
      setCeldaId(null);
      setMiCeldaInfo(null);
      setIsUiVisible(true);
      setLetraMostrada(null);
      setEfecto("inicial");
      prevEfectoRef.current = "inicial";
      lastTimestampRef.current = null;
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

  const seleccionarCelda = async (
    celda: Pick<Celda, "id" | "fila" | "columna" | "estado_celda">
  ) => {
    if (celda.estado_celda === 1)
      return alert("Esta posición ya está ocupada.");
    if (!selectedMatriz) return;

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
        sessionStorage.setItem(
          "miCeldaInfo",
          JSON.stringify({ fila: celda.fila, columna: celda.columna })
        );
      }
    });
  };

  const handleScreenTap = () => {
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    setIsUiVisible(true);
    uiTimeoutRef.current = setTimeout(() => setIsUiVisible(false), 2000);
  };

  useEffect(() => {
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
          console.error(`Wake Lock fallido: ${err.name}, ${err.message}`);
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
      if (
        efectoActual === "flash-fisico-regulable" ||
        efectoActual === "combinado"
      ) {
      } else if (
        prevEfectoRef.current.startsWith("flash-fisico-") ||
        prevEfectoRef.current === "combinado"
      ) {
        stopFlashing();
      }
      prevEfectoRef.current = efectoActual;
    };

    const verificarEstado = async () => {
      if (!celdaId) return;

      const { data: celdaData, error: celdaError } = await supabase
        .from("celdas")
        .select("estado_celda, efecto_id, letra_asignada")
        .eq("id", celdaId)
        .single();

      if (celdaError || !celdaData) {
        console.error(
          "No se pudo obtener el estado de la celda, reintentando..."
        );
        return;
      }

      if (celdaData.estado_celda === 0) {
        return liberarMiCelda();
      }

      const { data: globalData } = await supabase
        .from("estado_concierto")
        .select(
          "efecto_actual, efecto_timestamp, efecto_parpadeo_config, efecto_flash_config, audio_url"
        )
        .eq("id", 1)
        .single();

      const timestamp = globalData?.efecto_timestamp;

      if (timestamp && timestamp !== lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;

        const efectoGlobalNuevo = globalData?.efecto_actual || "inicial";
        const efectoCeldaNuevo = await getNombreEfecto(celdaData.efecto_id);
        const textoCelda = celdaData.letra_asignada;
        const parpadeoConfig =
          globalData?.efecto_parpadeo_config as ParpadeoConfig | null;
        const flashConfig =
          globalData?.efecto_flash_config as FlashConfig | null;
        const audioUrl = globalData?.audio_url as string | null;

        let efectoFinal = "inicial";
        if (
          efectoGlobalNuevo !== "inicial" &&
          !efectoGlobalNuevo.startsWith("efecto-ola")
        ) {
          efectoFinal = efectoGlobalNuevo;
        } else {
          efectoFinal = efectoCeldaNuevo;
        }

        scheduleEffect(
          efectoFinal,
          textoCelda,
          timestamp,
          parpadeoConfig,
          flashConfig,
          audioUrl
        );
        handleEfectoChange(efectoFinal);
      }
    };

    verificarEstado();
    const intervalId = setInterval(verificarEstado, 350);

    return () => {
      clearInterval(intervalId);
      releaseCamera();
      stopTextoLoop();
      if (efectoTimeoutRef.current) clearTimeout(efectoTimeoutRef.current);
    };
  }, [celdaId]);

  const claseFondo = `efecto-${efecto}`;

  if (!hasInteracted) {
    return (
      <div className="container-seleccion">
        <h1>Bienvenido</h1>
        <p>Presiona el botón para unirte a la experiencia interactiva.</p>
        <button onClick={handleInteraction} className="boton-matriz">
          Unirse
        </button>
        <audio ref={audioRef} loop style={{ display: "none" }} />
      </div>
    );
  }

  if (celdaId) {
    return (
      <div
        className={`container-confirmacion ${claseFondo}`}
        onClick={handleScreenTap}
      >
        <audio ref={audioRef} loop />
        {efecto === "mostrar-letra" && letraMostrada ? (
          <div className="container-letra">
            <span className="letra-display">{letraMostrada}</span>
          </div>
        ) : (
          <div className={`info-container ${isUiVisible ? "visible" : ""}`}>
            <h1>¡Listo!</h1>
            <p>Tu posición está confirmada.</p>
            <div className="luz-indicadora"></div>
          </div>
        )}
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
          {" "}
          ← Volver{" "}
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
