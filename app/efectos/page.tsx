// app/efectos/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import "./efectos.css"; // Asegúrate que la ruta al CSS es correcta

// Definimos los tipos para nuestros datos
type Celda = { id: number; fila: number; columna: number; estado_celda: number };
type Matriz = { id: number; nombre: string; filas: number; columnas: number };

export default function EfectoPage() {
  const [matriz, setMatriz] = useState<Matriz | null>(null);
  const [celdas, setCeldas] = useState<Celda[]>([]);
  const [celdaId, setCeldaId] = useState<number | null>(null);
  const [efecto, setEfecto] = useState<string>("inicial");
  const [efectoGlobal, setEfectoGlobal] = useState<string>("inicial");
  const [mensaje, setMensaje] = useState("Cargando matriz...");
  const [claseCss, setClaseCss] = useState<string>("fondo-seleccion"); // ¡NUEVO ESTADO PARA LA CLASE!

  const [isPending, startTransition] = useTransition();

  const getNombreEfecto = async (efectoId: number | null): Promise<string> => {
    if (!efectoId) return "inicial";
    const { data, error } = await supabase.from("efectos").select("nombre_css").eq("id", efectoId).single();
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
      const { data, error } = await supabase.rpc('ocupar_celda_especifica', {
        matriz_id_in: matriz!.id,
        fila_in: celda.fila,
        columna_in: celda.columna
      });

      if (error || !data || data.length === 0) {
        console.error("Error o celda ya ocupada:", error);
        alert("Alguien más tomó este lugar. ¡Intenta de nuevo!");
        cargarMatriz(); 
        return;
      }
      
      const nuevaCeldaId = data[0].celda_id;
      if (nuevaCeldaId) {
        setCeldaId(nuevaCeldaId);
        sessionStorage.setItem('miCeldaId', nuevaCeldaId.toString());
        const { data: celdaInicial } = await supabase.from('celdas').select('efecto_id').eq('id', nuevaCeldaId).single();
        if (celdaInicial) {
            const nombreEfectoInicial = await getNombreEfecto(celdaInicial.efecto_id);
            setEfecto(nombreEfectoInicial);
        }
      }
    });
  };

  const liberarMiCelda = async () => {
    if (!celdaId) return;
    startTransition(async () => {
        await supabase.rpc('liberar_celda', { celda_id_in: celdaId });
        sessionStorage.removeItem('miCeldaId');
        setCeldaId(null);
        cargarMatriz();
    });
  };
  
  const cargarMatriz = async () => {
    const { data: matrizData, error: matrizError } = await supabase.from('matrices').select('*').eq('id', 1).single();
    if (matrizError) return setMensaje("No se pudo cargar la matriz.");
    setMatriz(matrizData);

    const { data: celdasData, error: celdasError } = await supabase.from('celdas').select('id, fila, columna, estado_celda').eq('matriz_id', matrizData.id).order('fila, columna');
    if (celdasError) return setMensaje("No se pudieron cargar las posiciones.");
    setCeldas(celdasData);
    setMensaje("Elige tu posición en la matriz");
  };

  useEffect(() => {
    const idGuardado = sessionStorage.getItem('miCeldaId');
    if (idGuardado) {
      setCeldaId(Number(idGuardado));
    } else {
      cargarMatriz();
    }
  }, []);

  useEffect(() => {
    if (!celdaId) return;
    const verificarEstado = async () => {
        const { data: miCeldaData, error: miCeldaError } = await supabase.from('celdas').select('estado_celda, efecto_id').eq('id', celdaId).single();
        if (miCeldaError || !miCeldaData) {
            console.error("No se pudo verificar el estado de la celda. Saliendo...", miCeldaError);
            liberarMiCelda();
            return;
        }
        if (miCeldaData.estado_celda === 0) {
            console.log("El administrador ha liberado tu posición.");
            liberarMiCelda();
            return; 
        }
        const nombreEfectoNuevo = await getNombreEfecto(miCeldaData.efecto_id);
        if (nombreEfectoNuevo !== efecto) {
            setEfecto(nombreEfectoNuevo);
        }
        const { data: globalData } = await supabase.from('estado_concierto').select('efecto_actual').eq('id', 1).single();
        if (globalData && globalData.efecto_actual !== efectoGlobal) {
            setEfectoGlobal(globalData.efecto_actual);
        }
    };
    const intervalId = setInterval(verificarEstado, 3000);
    verificarEstado();
    return () => clearInterval(intervalId);
  }, [celdaId, efecto, efectoGlobal]);

  // --- LÓGICA DE ESTILOS CORREGIDA ---
  useEffect(() => {
    if (!celdaId) {
      setClaseCss('container-seleccion'); // Pantalla de selección
      return;
    }
    // Determina la clase del efecto a aplicar
    const claseEfecto = efectoGlobal && efectoGlobal !== "inicial" 
      ? `efecto-${efectoGlobal}` 
      : `efecto-${efecto}`;
    
    // Combina la clase base del contenedor con la clase del efecto
    setClaseCss(`container-confirmacion ${claseEfecto}`);
  }, [celdaId, efecto, efectoGlobal]);

  // Si ya se eligió una celda, mostramos un mensaje de confirmación
  if (celdaId) {
    return (
      <div className={claseCss}> {/* Aplicamos la clase dinámica aquí */}
        <h1>¡Listo!</h1>
        <p>Tu posición está confirmada. Mantén esta ventana abierta.</p>
        <div className="luz-indicadora"></div>
        <button onClick={liberarMiCelda} disabled={isPending} className="boton-salir">
            Salir de la posición
        </button>
      </div>
    );
  }

  // Si no, mostramos la cuadrícula para que el usuario elija
  return (
    <div className={claseCss}> {/* Y también aquí */}
      <h1>{matriz ? matriz.nombre : 'Cargando...'}</h1>
      <p>{mensaje}</p>
      {matriz && (
        <div
          className="matriz-grid-seleccion"
          style={{ gridTemplateColumns: `repeat(${matriz.columnas}, 1fr)` }}
        >
          {celdas.map((celda) => (
            <button
              key={celda.id}
              className={`celda-seleccion ${celda.estado_celda === 1 ? 'ocupada' : 'libre'}`}
              onClick={() => seleccionarCelda(celda)}
              disabled={isPending || celda.estado_celda === 1}
              title={`Fila ${celda.fila}, Columna ${celda.columna}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}