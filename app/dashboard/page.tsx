// app/dashboard/page.tsx
"use client";

import { supabase } from "@/lib/supabase";

// ¡Usa la service_role key aquí! porque es una acción de admin.
// Guárdala en variables de entorno para seguridad.

export default function DashboardPage() {
  const cambiarEfecto = async (nombreEfecto: string) => {
    const { error } = await supabase
      .from("estado_concierto")
      .update({ efecto_actual: nombreEfecto })
      .eq("id", 1);

    if (error) {
      console.error("Error al cambiar el efecto:", error);
    } else {
      console.log(`Efecto cambiado a: ${nombreEfecto}`);
    }
  };

  return (
    <div>
      <h1>Control de Efectos</h1>
      <button onClick={() => cambiarEfecto("arcoiris")}>
        Efecto Arcoiris 🌈
      </button>
      <button onClick={() => cambiarEfecto("rojo-pulsante")}>
        Rojo Pulsante ❤️
      </button>
      <button onClick={() => cambiarEfecto("apagon")}>Apagón ⬛</button>
      <button onClick={() => cambiarEfecto("parpadeo")}>
        Efecto Parpadeo ⚡️
      </button>
      <button onClick={() => cambiarEfecto("inicial")}>Resetear</button>
    </div>
  );
}
