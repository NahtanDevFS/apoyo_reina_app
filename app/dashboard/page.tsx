// app/dashboard/page.tsx
import { supabase } from "@/lib/supabase";
import {
  createMatriz,
  syncPredefinedEfectos,
  applyEfectoToCeldas,
  applyGlobalEfecto,
  liberarCeldas,
  applyTextoToCelda, // ¡MODIFICADO! Importamos la nueva acción
} from "./actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { data: matrices } = await supabase.from("matrices").select("*");
  const { data: efectos } = await supabase.from("efectos").select("*");

  const getCeldas = async (matrizId: number) => {
    "use server";
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
      applyLetraAction={applyTextoToCelda} // ¡MODIFICADO! Pasamos la nueva acción
    />
  );
}