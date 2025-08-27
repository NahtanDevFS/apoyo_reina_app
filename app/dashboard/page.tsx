// app/dashboard/page.tsx
import { supabase } from "@/lib/supabase"; // Usamos el cliente normal para LEER datos
import {
  createMatriz,
  syncPredefinedEfectos,
  applyEfectoToCeldas,
  applyGlobalEfecto,
  liberarCeldas,
  applyLetraToCelda, // ¡1. Importamos la nueva acción!
} from "./actions";
import DashboardClient from "./DashboardClient";

// Esta página ahora será un Server Component que obtiene los datos iniciales
export default async function DashboardPage() {
  // Fetch inicial de datos en el servidor
  const { data: matrices } = await supabase.from("matrices").select("*");
  const { data: efectos } = await supabase.from("efectos").select("*");

  // Función para obtener las celdas de una matriz específica
  const getCeldas = async (matrizId: number) => {
    "use server"; // Esta función anidada también es una Server Action
    const { data } = await supabase
      .from("celdas")
      .select("*")
      .eq("matriz_id", matrizId)
      .order("fila, columna");
    return data;
  };

  return (
    <DashboardClient
      initialMatrices={matrices || []}
      initialEfectos={efectos || []}
      getCeldasAction={getCeldas}
      createMatrizAction={createMatriz}
      syncEfectosAction={syncPredefinedEfectos}
      applyEfectoAction={applyEfectoToCeldas}
      applyGlobalEfectoAction={applyGlobalEfecto}
      liberarCeldasAction={liberarCeldas}
      applyLetraAction={applyLetraToCelda} // ¡2. Pasamos la nueva acción como prop!
    />
  );
}
