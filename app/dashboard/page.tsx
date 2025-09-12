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
  applyFlashFisicoAction,
  applyCombinedEffect,
  applyRitmoInteractivoAction,
  getAudioFiles, // <-- 1. Importar la nueva acción
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

  // 2. Llamar a la acción para obtener la lista de archivos
  const { files: audioFiles } = await getAudioFiles();

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
      initialAudioFiles={audioFiles || []} // <-- 3. Pasar la lista al componente
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
      applyRitmoInteractivoAction={applyRitmoInteractivoAction}
      applyFlashFisicoAction={applyFlashFisicoAction}
      applyCombinedEffectAction={applyCombinedEffect}
    />
  );
}