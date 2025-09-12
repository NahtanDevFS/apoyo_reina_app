// app/dashboard/page.tsx
import { supabase } from "@/lib/supabase";
import {
  createMatriz,
  syncPredefinedEfectos,
  applyEfectoToCeldas,
  applyGlobalEfecto,
  liberarCeldas,
  applyTextoToCelda,
  liberarMatrizCompleta,
  applyTextoToMatriz,
  applyParpadeoPersonalizadoAction,
  applyRitmoInteractivoAction, // <-- IMPORTAMOS LA NUEVA ACCIÓN
  applyFlashFisicoAction,
  applyCombinedEffect,
} from "./actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { data: matrices } = await supabase.from("matrices").select("*");
  const { data: efectos } = await supabase.from("efectos").select("*");
  const { data: estadoConcierto } = await supabase
    .from("estado_concierto")
    .select("efecto_parpadeo_config, efecto_flash_config, audio_url")
    .eq("id", 1)
    .single();

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
      initialParpadeoConfig={
        estadoConcierto?.efecto_parpadeo_config || {
          colors: ["#FFFFFF", "#000000"],
          speed: 0.5,
        }
      }
      initialFlashConfig={
        estadoConcierto?.efecto_flash_config || { speed: 0.5 }
      }
      getCeldasAction={getCeldas}
      createMatrizAction={createMatriz}
      syncEfectosAction={syncPredefinedEfectos}
      applyEfectoAction={applyEfectoToCeldas}
      applyGlobalEfectoAction={applyGlobalEfecto}
      liberarCeldasAction={liberarCeldas}
      applyLetraAction={applyTextoToCelda}
      liberarMatrizAction={liberarMatrizCompleta}
      applyTextoToMatrizAction={applyTextoToMatriz}
      applyParpadeoPersonalizadoAction={applyParpadeoPersonalizadoAction}
      applyRitmoInteractivoAction={applyRitmoInteractivoAction} // <-- PASAMOS LA ACCIÓN
      applyFlashFisicoAction={applyFlashFisicoAction}
      applyCombinedEffectAction={applyCombinedEffect}
    />
  );
}