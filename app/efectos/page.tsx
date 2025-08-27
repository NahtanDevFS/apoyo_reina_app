// app/efectos/page.tsx
"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabase";
import "./efectos.css"; // Asegúrate que la ruta al CSS es correcta

// Definimos los tipos para nuestros datos
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
  const [efecto, setEfecto] = useState<string>("inicial");
  const [efectoGlobal, setEfectoGlobal] = useState<string>("inicial");
  const [mensaje, setMensaje] = useState("Cargando eventos...");

  // --- ¡NUEVO! --- Estado para guardar la letra a mostrar
  const [letra, setLetra] = useState<string | null>(null);

  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();

  const getNombreEfecto = async (efectoId: number | null): Promise<string> => {
    if (!efectoId) return "inicial";
    const { data, error } = await supabase
      .from("efectos")
      .select("nombre_css")
      .eq("id", efectoId)
      .single();
    if (error || !data) {
      console.error("Error al buscar el nombre del efecto:", error);
      return "inicial";
    }
    return data.nombre_css;
  };

  const seleccionarCelda = async (celda: Celda) => {
    if (celda.estado_celda === 1) {
      alert("Esta posición ya está ocupada. Por favor, elige otra.");
      return;
    }
    startTransition(async () => {
      const { data, error } = await supabase.rpc("ocupar_celda_especifica", {
        matriz_id_in: selectedMatriz!.id,
        fila_in: celda.fila,
        columna_in: celda.columna,
      });
      if (error || !data || data.length === 0) {
        if (selectedMatriz) cargarCeldasDeMatriz(selectedMatriz);
        return;
      }
      const nuevaCeldaId = data[0].celda_id;
      if (nuevaCeldaId) {
        setCeldaId(nuevaCeldaId);
        sessionStorage.setItem("miCeldaId", nuevaCeldaId.toString());
        const { data: celdaInicial } = await supabase
          .from("celdas")
          .select("efecto_id, letra_asignada")
          .eq("id", nuevaCeldaId)
          .single();
        if (celdaInicial) {
          const nombreEfectoInicial = await getNombreEfecto(
            celdaInicial.efecto_id
          );
          setEfecto(nombreEfectoInicial);
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
      setCeldaId(null);
      setIsUiVisible(true);
      setLetra(null); // Limpiamos la letra al salir
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

  useEffect(() => {
    const idGuardado = sessionStorage.getItem("miCeldaId");
    if (idGuardado) {
      setCeldaId(Number(idGuardado));
      setIsUiVisible(false);
    } else {
      cargarTodasLasMatrices();
    }
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!celdaId) return;
    const verificarEstado = async () => {
      // --- ¡MODIFICADO! --- Ahora también pedimos la columna 'letra_asignada'
      const { data: miCeldaData, error: miCeldaError } = await supabase
        .from("celdas")
        .select("estado_celda, efecto_id, letra_asignada")
        .eq("id", celdaId)
        .single();

      if (miCeldaError || !miCeldaData) {
        liberarMiCelda();
        return;
      }
      if (miCeldaData.estado_celda === 0) {
        liberarMiCelda();
        return;
      }

      // Actualizar el estado de la letra
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

  if (celdaId) {
    // --- ¡NUEVA LÓGICA DE RENDERIZADO! ---
    // Si el efecto es 'mostrar-letra' y tenemos una letra, mostramos la pantalla especial.
    if (claseEfecto === "efecto-mostrar-letra" && letra) {
      return (
        <div className={`container-letra ${claseEfecto}`}>
          <span className="letra-display">{letra}</span>
        </div>
      );
    }

    // Si no, mostramos la pantalla de confirmación normal con la lógica de UI visible/invisible.
    const isEffectActive = claseEfecto !== "efecto-inicial";
    const showUi = isUiVisible || !isEffectActive;
    return (
      <div
        className={`container-confirmacion ${claseEfecto}`}
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
          Salir de la posición
        </button>
      </div>
    );
  }

  if (selectedMatriz) {
    return (
      <div className="container-seleccion">
        <button onClick={cargarTodasLasMatrices} className="boton-volver">
          ← Volver a eventos
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
