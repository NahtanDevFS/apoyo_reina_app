// lib/useSocket.ts
"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Se lee la variable de entorno de Vercel. Si no existe (en local), usa una cadena vacía.
const URL = process.env.NEXT_PUBLIC_URL || "";

// Se define la ruta como una constante para asegurar que coincida con la del servidor.
const SOCKET_PATH = "/api/socket";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Se crea la instancia del socket con la URL y la ruta explícitas.
    const newSocket = io(URL, {
      path: SOCKET_PATH,
      addTrailingSlash: false,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected successfully to server!");
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected from server.");
      setSocket(null);
    });

    // Este listener es clave para depurar errores de conexión en producción.
    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", {
        message: err.message,
        url: URL,
        path: SOCKET_PATH,
      });
    });

    // Limpieza al desmontar el componente.
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};
