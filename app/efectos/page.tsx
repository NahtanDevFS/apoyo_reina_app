// app/efecto/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./efectos.css"; // Asegúrate que la ruta al CSS es correcta

// RECUERDA: Guarda estas claves en variables de entorno (.env.local)
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "URL_DE_TU_PROYECTO";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "TU_API_KEY_ANON";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EfectoPage() {
  const [efecto, setEfecto] = useState<string>("inicial");

  // Función para obtener el efecto más reciente de la DB
  const fetchEffect = async () => {
    const { data, error } = await supabase
      .from("estado_concierto")
      .select("efecto_actual")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching effect:", error);
      return;
    }

    // Si el efecto de la base de datos es diferente al que tenemos, lo actualizamos
    if (data && data.efecto_actual !== efecto) {
      console.log(`Nuevo efecto detectado: ${data.efecto_actual}`);
      setEfecto(data.efecto_actual);
    }
  };

  // Usamos useEffect para configurar el polling
  useEffect(() => {
    // Hacemos una llamada inicial inmediata al cargar la página
    fetchEffect();

    // Configuramos un intervalo para que se ejecute cada 1000ms (1 segundo)
    const intervalId = setInterval(() => {
      fetchEffect();
    }, 1000);

    // Importante: Limpiamos el intervalo cuando el componente se desmonta
    // para evitar fugas de memoria.
    return () => clearInterval(intervalId);
  }, [efecto]); // El array de dependencias asegura que `efecto` esté actualizado

  // Este segundo useEffect aplica la clase al body cuando el estado 'efecto' cambia
  useEffect(() => {
    document.body.className = ""; // Limpiamos clases anteriores
    document.body.classList.add(`efecto-${efecto}`);
  }, [efecto]);

  return (
    <div className="container">
      {/* Puedes añadir contenido aquí si lo necesitas */}
    </div>
  );
}
