// app/dashboard/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Función auxiliar para actualizar el timestamp y disparar la sincronización
const updateTimestamp = async () => {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("estado_concierto")
    .update({ efecto_timestamp: now })
    .eq("id", 1);
};

export async function syncPredefinedEfectos() {
  const predefinedEfectos = [
    { nombre: "Apagón", nombre_css: "apagon" },
    { nombre: "Rojo Pulsante", nombre_css: "rojo-pulsante" },
    { nombre: "Arcoíris", nombre_css: "arcoiris" },
    { nombre: "Parpadeo", nombre_css: "parpadeo" },
    { nombre: "Inicial", nombre_css: "inicial" },
    { nombre: "Mostrar Letra", nombre_css: "mostrar-letra" },
    { nombre: "Efecto Ola", nombre_css: "efecto-ola" },
    { nombre: "Parpadeo Personalizado", nombre_css: "parpadeo-personalizado" },
    // --- ¡NUEVOS EFECTOS DE FLASH! ---
    { nombre: "Flash Físico Lento", nombre_css: "flash-fisico-lento" },
    { nombre: "Flash Físico Rápido", nombre_css: "flash-fisico-rapido" },
    { nombre: "Flash Físico SOS", nombre_css: "flash-fisico-sos" },
    { nombre: "Flash Personalizado", nombre_css: "flash-personalizado" },
  ];
  await supabaseAdmin
    .from("efectos")
    .upsert(predefinedEfectos, { onConflict: "nombre_css" });
  revalidatePath("/dashboard");
  return { success: true, message: "Efectos sincronizados." };
}

export async function applyGlobalEfecto(nombreEfecto: string) {
  await supabaseAdmin
    .from("estado_concierto")
    .update({
      efecto_actual: nombreEfecto,
      efecto_timestamp: new Date().toISOString(),
    })
    .eq("id", 1);
  return { success: true };
}

export async function applyParpadeoPersonalizadoAction(
  colors: string[],
  speed: number
) {
  const config = { colors, speed };
  const { error } = await supabaseAdmin
    .from("estado_concierto")
    .update({
      efecto_parpadeo_config: config,
      efecto_actual: "parpadeo-personalizado",
      efecto_timestamp: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- ¡NUEVA ACCIÓN PARA EL FLASH! ---
export async function applyFlashPersonalizadoAction(speed: number) {
  const config = { speed };
  const { error } = await supabaseAdmin
    .from("estado_concierto")
    .update({
      efecto_flash_config: config,
      efecto_actual: "flash-personalizado",
      efecto_timestamp: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function applyEfectoToCeldas(
  celdasIds: number[],
  efectoId: number | null
) {
  if (celdasIds.length === 0) return { success: true };

  const { error } = await supabaseAdmin
    .from("celdas")
    .update({
      efecto_id: efectoId,
      letra_asignada: null,
    })
    .in("id", celdasIds);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function applyTextoToCelda(celdaId: number, texto: string) {
  const { data: efecto } = await supabaseAdmin
    .from("efectos")
    .select("id")
    .eq("nombre_css", "mostrar-letra")
    .single();
  if (!efecto) return { error: "El efecto 'Mostrar Letra' no existe." };

  await supabaseAdmin
    .from("celdas")
    .update({
      efecto_id: efecto.id,
      letra_asignada: texto.trim().toUpperCase(),
    })
    .eq("id", celdaId);

  await updateTimestamp();
  revalidatePath("/dashboard");
  return { success: true };
}

export async function liberarCeldas(celdaIds: number[]) {
  const { error } = await supabaseAdmin
    .from("celdas")
    .update({ estado_celda: 0, letra_asignada: null, efecto_id: null })
    .in("id", celdaIds);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function liberarMatrizCompleta(matrizId: number) {
  if (!matrizId) return { error: "No se ha seleccionado una matriz." };
  const { error } = await supabaseAdmin
    .from("celdas")
    .update({ estado_celda: 0, letra_asignada: null, efecto_id: null })
    .eq("matriz_id", matrizId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true, message: "Todas las celdas han sido liberadas." };
}

export async function applyTextoToMatriz(matrizId: number, texto: string) {
  if (!matrizId) return { error: "No se ha seleccionado una matriz." };
  const { data: efecto } = await supabaseAdmin
    .from("efectos")
    .select("id")
    .eq("nombre_css", "mostrar-letra")
    .single();
  if (!efecto) return { error: "El efecto 'Mostrar Letra' no existe." };

  await supabaseAdmin
    .from("celdas")
    .update({
      efecto_id: efecto.id,
      letra_asignada: texto.trim().toUpperCase(),
    })
    .eq("matriz_id", matrizId);

  await updateTimestamp();
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createMatriz(formData: FormData) {
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
  await supabaseAdmin.from("celdas").insert(celdasParaInsertar);
  revalidatePath("/dashboard");
  return { success: true };
}
