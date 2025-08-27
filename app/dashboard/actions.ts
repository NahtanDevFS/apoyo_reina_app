// app/dashboard/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Cliente de Supabase para el servidor (sin cambios)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ¡NUEVO! ACCIÓN PARA SINCRONIZAR EFECTOS ---
export async function syncPredefinedEfectos() {
  // Lista de efectos predeterminados que existen en tu archivo efectos.css
  const predefinedEfectos = [
    { nombre: "Apagón", nombre_css: "apagon", descripcion: "Fondo completamente negro." },
    { nombre: "Rojo Pulsante", nombre_css: "rojo-pulsante", descripcion: "El color rojo aparece y desaparece." },
    { nombre: "Arcoíris", nombre_css: "arcoiris", descripcion: "Gradiente de colores en movimiento." },
    { nombre: "Parpadeo", nombre_css: "parpadeo", descripcion: "Alterna rápidamente entre blanco y negro." },
    { nombre: "Inicial", nombre_css: "inicial", descripcion: "Estado por defecto, fondo oscuro." }
  ];

  // Insertar los efectos en la base de datos.
  // ON CONFLICT (nombre_css) DO NOTHING asegura que no se creen duplicados
  // si un efecto con el mismo nombre_css ya existe.
  const { error } = await supabaseAdmin
    .from("efectos")
    .upsert(predefinedEfectos, { onConflict: 'nombre_css' });

  if (error) {
    console.error("Error al sincronizar efectos:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard"); // Actualiza la página del dashboard
  return { success: true, message: "Efectos sincronizados correctamente." };
}


// --- OTRAS ACCIONES (sin cambios) ---

export async function createMatriz(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const filas = Number(formData.get("filas"));
  const columnas = Number(formData.get("columnas"));

  if (!nombre || !filas || !columnas) {
    return { error: "Todos los campos son requeridos." };
  }

  const { data: matriz, error: matrizError } = await supabaseAdmin
    .from("matrices")
    .insert({ nombre, filas, columnas })
    .select()
    .single();

  if (matrizError) {
    console.error("Error al crear la matriz:", matrizError);
    return { error: matrizError.message };
  }

  const celdasParaInsertar = [];
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      celdasParaInsertar.push({ matriz_id: matriz.id, fila: i, columna: j, estado_celda: 0 });
    }
  }

  const { error: celdasError } = await supabaseAdmin.from("celdas").insert(celdasParaInsertar);
  if (celdasError) {
    console.error("Error al crear las celdas:", celdasError);
    return { error: celdasError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function applyEfectoToCeldas(celdaIds: number[], efectoId: number | null) {
  const { error } = await supabaseAdmin
    .from("celdas")
    .update({ efecto_id: efectoId, updated_at: new Date().toISOString() })
    .in("id", celdaIds);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function applyGlobalEfecto(nombreEfecto: string) {
    const { error } = await supabaseAdmin
      .from("estado_concierto")
      .update({ efecto_actual: nombreEfecto })
      .eq("id", 1);

    if (error) return { error: error.message };
    return { success: true };
}

export async function liberarCeldas(celdaIds: number[]) {
    const { error } = await supabaseAdmin
    .from("celdas")
    .update({ estado_celda: 0 })
    .in("id", celdaIds);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}