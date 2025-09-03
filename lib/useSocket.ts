// lib/useSocket.ts
"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// --- ¡CORRECCIÓN AQUÍ! ---
// Leemos la variable de entorno para obtener la URL de nuestra aplicación.
// NEXT_PUBLIC_URL es una variable que debes configurar en Vercel.
// Si no está definida (como en el entorno local), usamos una cadena vacía.
const URL = process.env.NEXT_PUBLIC_URL || "";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Ya no es necesario el fetch a /api/socket. La conexión directa es más fiable.

    // Creamos la instancia del cliente de socket, pasándole la URL explícitamente.
    // En local, URL será '' y se conectará al host actual.
    // En Vercel, usará la URL de producción que hayas configurado.
    const newSocket = io(URL, {
      path: "/api/socket", // Nos aseguramos que se conecte a la ruta correcta de la API
      addTrailingSlash: false, // Evita problemas de slash duplicado en la URL
    });

    newSocket.on("connect", () => {
      console.log("Socket connected to server!");
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected from server.");
      setSocket(null);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    // Limpieza: nos aseguramos de desconectar el socket cuando el componente se desmonte.
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};
