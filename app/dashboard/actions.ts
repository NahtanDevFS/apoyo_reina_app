// app/dashboard/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ¡NUEVO! Acción para avanzar la ola ---
// El dashboard llamará a esta función repetidamente.
export async function advanceWaveEffect(column: number, totalColumns: number) {
  const colors = ["#c62b28", "#16709f"]; // Rojo, Azul
  const color = colors[column % colors.length];

  // Guardamos el estado de la ola como un objeto JSON en la base de datos
  const waveState = {
    type: "ola",
    column: column,
    color: color,
  };

  const { error } = await supabaseAdmin
    .from("estado_concierto")
    .update({ efecto_actual: JSON.stringify(waveState) })
    .eq("id", 1);

  if (error) return { error: error.message };
  return { success: true };
}

// --- ¡NUEVO! Acción para detener la ola ---
export async function stopWaveEffect() {
  const { error } = await supabaseAdmin
    .from("estado_concierto")
    .update({ efecto_actual: "inicial" }) // Reseteamos al estado inicial
    .eq("id", 1);

  if (error) return { error: error.message };
  return { success: true };
}

// --- El resto de tus acciones existentes ---

export async function syncPredefinedEfectos() {
  // ... tu código existente
  const predefinedEfectos = [
    {
      nombre: "Apagón",
      nombre_css: "apagon",
      descripcion: "Fondo completamente negro.",
    },
    {
      nombre: "Rojo Pulsante",
      nombre_css: "rojo-pulsante",
      descripcion: "El color rojo aparece y desaparece.",
    },
    {
      nombre: "Arcoíris",
      nombre_css: "arcoiris",
      descripcion: "Gradiente de colores en movimiento.",
    },
    {
      nombre: "Parpadeo",
      nombre_css: "parpadeo",
      descripcion: "Alterna rápidamente entre blanco y negro.",
    },
    {
      nombre: "Inicial",
      nombre_css: "inicial",
      descripcion: "Estado por defecto, fondo oscuro.",
    },
    {
      nombre: "Mostrar Letra",
      nombre_css: "mostrar-letra",
      descripcion: "Muestra una letra específica en pantalla.",
    },
  ];

  const { error } = await supabaseAdmin
    .from("efectos")
    .upsert(predefinedEfectos, {
      onConflict: "nombre_css",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("Error al sincronizar efectos:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, message: "Efectos sincronizados correctamente." };
}

export async function applyLetraToCelda(celdaId: number, letra: string) {
  // ... tu código existente
  const { data: efecto, error: efectoError } = await supabaseAdmin
    .from("efectos")
    .select("id")
    .eq("nombre_css", "mostrar-letra")
    .single();

  if (efectoError || !efecto) {
    return {
      error:
        "El efecto 'Mostrar Letra' no existe. Sincroniza los efectos desde el dashboard.",
    };
  }

  const { error } = await supabaseAdmin
    .from("celdas")
    .update({
      efecto_id: efecto.id,
      letra_asignada: letra.trim().substring(0, 1).toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", celdaId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function applyEfectoToCeldas(
  celdaIds: number[],
  efectoId: number | null
) {
  // ... tu código existente
  const { error } = await supabaseAdmin
    .from("celdas")
    .update({
      efecto_id: efectoId,
      letra_asignada: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", celdaIds);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function liberarCeldas(celdaIds: number[]) {
  // ... tu código existente
  const { error } = await supabaseAdmin
    .from("celdas")
    .update({ estado_celda: 0, letra_asignada: null, efecto_id: null })
    .in("id", celdaIds);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createMatriz(formData: FormData) {
  // ... tu código existente
  const nombre = formData.get("nombre") as string;
  const filas = Number(formData.get("filas"));
  const columnas = Number(formData.get("columnas"));
  if (!nombre || !filas || !columnas)
    return { error: "Todos los campos son requeridos." };
  const { data: matriz, error: matrizError } = await supabaseAdmin
    .from("matrices")
    .insert({ nombre, filas, columnas })
    .select()
    .single();
  if (matrizError) return { error: matrizError.message };
  const celdasParaInsertar = [];
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      celdasParaInsertar.push({
        matriz_id: matriz.id,
        fila: i,
        columna: j,
        estado_celda: 0,
      });
    }
  }
  const { error: celdasError } = await supabaseAdmin
    .from("celdas")
    .insert(celdasParaInsertar);
  if (celdasError) return { error: celdasError.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function applyGlobalEfecto(nombreEfecto: string) {
  // ... tu código existente
  const { error } = await supabaseAdmin
    .from("estado_concierto")
    .update({ efecto_actual: nombreEfecto })
    .eq("id", 1);
  if (error) return { error: error.message };
  return { success: true };
}
