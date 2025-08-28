// lib/useSocket.ts
"use client";
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Este es un hook reutilizable para manejar la conexión de Socket.IO
export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Hacemos un fetch a nuestra propia API route para iniciar la conexión.
    // Esto es un paso necesario para que Next.js "despierte" el servidor de socket.
    fetch('/api/socket');

    // Creamos la instancia del cliente de socket
    const newSocket = io();

    newSocket.on('connect', () => {
      console.log('Socket connected to server!');
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected from server.');
      setSocket(null);
    });

    // Limpieza: nos aseguramos de desconectar el socket cuando el componente se desmonte.
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};
