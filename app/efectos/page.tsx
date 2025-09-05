// app/efectos/page.tsx
"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabase";
import "./efectos.css";

// Tipos
type Celda = { id: number; fila: number; columna: number; estado_celda: number };
type Matriz = { id: number; nombre: string; filas: number; columnas: number };

export default function EfectoPage() {
  const [allMatrices, setAllMatrices] = useState<Matriz[]>([]);
  const [selectedMatriz, setSelectedMatriz] = useState<Matriz | null>(null);
  const [celdas, setCeldas] = useState<Celda[]>([]);
  const [celdaId, setCeldaId] = useState<number | null>(null);
  const [miCeldaInfo, setMiCeldaInfo] = useState<{ fila: number; columna: number } | null>(null);
  const [efecto, setEfecto] = useState<string>("inicial");
  const [efectoGlobal, setEfectoGlobal] = useState<string>("inicial");
  const [textoAsignado, setTextoAsignado] = useState<string | null>(null);
  const [letraMostrada, setLetraMostrada] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("Cargando eventos...");
  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();

  const textoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const efectoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const SYNCHRONIZATION_DELAY_MS = 3500;

  const scheduleEffect = (efecto: string, texto: string | null, timestamp: string) => {
    if (efectoTimeoutRef.current) clearTimeout(efectoTimeoutRef.current);

    const serverTime = new Date(timestamp).getTime();
    const clientTime = new Date().getTime();
    const executionTime = serverTime + SYNCHRONIZATION_DELAY_MS;
    
    const delay = Math.max(0, executionTime - clientTime);

    efectoTimeoutRef.current = setTimeout(() => {
      setEfecto(efecto);
      if (efecto === 'mostrar-letra' && texto) {
        startTextoLoop(texto);
      } else {
        stopTextoLoop();
      }
    }, delay);
  };

  const stopTextoLoop = () => {
    if (textoIntervalRef.current) clearInterval(textoIntervalRef.current);
    textoIntervalRef.current = null;
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
    const { data } = await supabase.from("efectos").select("nombre_css").eq("id", efectoId).single();
    return data?.nombre_css || "inicial";
  };
  
  const liberarMiCelda = async () => {
    if (!celdaId) return;
    startTransition(async () => {
      stopTextoLoop();
      if (efectoTimeoutRef.current) clearTimeout(efectoTimeoutRef.current);
      await supabase.rpc("liberar_celda", { celda_id_in: celdaId });
      sessionStorage.removeItem("miCeldaId");
      sessionStorage.removeItem("miCeldaInfo");
      setCeldaId(null);
      setMiCeldaInfo(null);
      setIsUiVisible(true);
      setTextoAsignado(null);
      setLetraMostrada(null);
      setEfecto("inicial");
      setEfectoGlobal("inicial");
      lastTimestampRef.current = null;
      cargarTodasLasMatrices();
    });
  };

  const cargarTodasLasMatrices = async () => {
    setMensaje("Cargando eventos disponibles...");
    setSelectedMatriz(null);
    const { data, error } = await supabase.from("matrices").select("*").order("nombre");
    if (error) { setMensaje("No se pudieron cargar los eventos."); return; }
    setAllMatrices(data);
    setMensaje("Selecciona tu evento o sección");
  };

  const cargarCeldasDeMatriz = async (matriz: Matriz) => {
    setMensaje(`Cargando posiciones para ${matriz.nombre}...`);
    setSelectedMatriz(matriz);
    const { data, error } = await supabase.from("celdas").select("id, fila, columna, estado_celda").eq("matriz_id", matriz.id).order("fila, columna");
    if (error) { setMensaje("No se pudieron cargar las posiciones."); return; }
    setCeldas(data);
    setMensaje(`Elige tu posición en ${matriz.nombre}`);
  };

  const seleccionarCelda = async (celda: Celda) => {
    if (celda.estado_celda === 1) return alert("Esta posición ya está ocupada.");
    if (!selectedMatriz) return;
    startTransition(async () => {
      const { data, error } = await supabase.rpc("ocupar_celda_especifica", { matriz_id_in: selectedMatriz.id, fila_in: celda.fila, columna_in: celda.columna });
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
    return () => { if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current); };
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && celdaId) {
        try { wakeLockRef.current = await navigator.wakeLock.request("screen"); } 
        catch (err: any) { console.error(`Wake Lock fallido: ${err.name}, ${err.message}`); }
      }
    };
    const releaseWakeLock = async () => { if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; }};
    requestWakeLock();
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") requestWakeLock(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { releaseWakeLock(); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, [celdaId]);

  useEffect(() => {
    if (!celdaId) return;

    const verificarEstado = async () => {
      const { data: estadoGlobal } = await supabase
        .from("estado_concierto")
        .select("efecto_actual, efecto_timestamp")
        .eq("id", 1)
        .single();

      const { data: miCeldaData } = await supabase
        .from("celdas")
        .select("estado_celda, efecto_id, letra_asignada")
        .eq("id", celdaId)
        .single();

      if (!miCeldaData || miCeldaData.estado_celda === 0) return liberarMiCelda();

      const timestamp = estadoGlobal?.efecto_timestamp;
      if (timestamp && timestamp !== lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;

        const efectoGlobal = estadoGlobal?.efecto_actual || "inicial";
        const efectoCelda = await getNombreEfecto(miCeldaData.efecto_id);
        const textoCelda = miCeldaData.letra_asignada;
        const efectoFinal = efectoGlobal !== 'inicial' ? efectoGlobal : efectoCelda;
        
        scheduleEffect(efectoFinal, textoCelda, timestamp);
      }
    };

    verificarEstado();
    const intervalId = setInterval(verificarEstado, 1000);
    
    return () => {
      clearInterval(intervalId);
      if (efectoTimeoutRef.current) clearTimeout(efectoTimeoutRef.current);
      stopTextoLoop();
    };
  }, [celdaId]);

  const efectoActivo = efectoGlobal !== "inicial" ? efectoGlobal : efecto;
  const claseFondo = `efecto-${efectoActivo}`;
  
  if (celdaId) {
    return (
      <div className={`container-confirmacion ${claseFondo}`} onClick={handleScreenTap}>
        
        {(efecto === "mostrar-letra" && letraMostrada) ? (
            <div className="container-letra">
               <span className="letra-display">{letraMostrada}</span>
            </div>
          ) : (
            <div className={`info-container ${isUiVisible ? "visible" : ""}`}>
              <h1>¡Listo!</h1>
              <p>Tu posición está confirmada.</p>
              <div className="luz-indicadora"></div>
            </div>
          )
        }
        <button onClick={liberarMiCelda} disabled={isPending} className={`boton-salir ${isUiVisible ? "visible" : ""}`}>
          Salir
        </button>
      </div>
    );
  }
  
  if (selectedMatriz) {
    return (
      <div className="container-seleccion">
        <button onClick={cargarTodasLasMatrices} className="boton-volver"> ← Volver </button>
        <h1>{selectedMatriz.nombre}</h1>
        <p>{mensaje}</p>
        <div className="matriz-grid-seleccion" style={{ gridTemplateColumns: `repeat(${selectedMatriz.columnas}, 1fr)` }}>
          {celdas.map((celda) => (
            <button key={celda.id} className={`celda-seleccion ${celda.estado_celda === 1 ? "ocupada" : "libre"}`}
              onClick={() => seleccionarCelda(celda)} disabled={isPending || celda.estado_celda === 1}
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