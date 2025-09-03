// pages/api/socket.ts
import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Socket as NetSocket } from "net";

// Interfaz para extender la respuesta de la API
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: Server;
    };
  };
}

// Objeto para almacenar los intervalos de las olas por matriz
const waveIntervals: Record<number, NodeJS.Timeout> = {};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log("Socket.IO server already running.");
  } else {
    console.log("Starting Socket.IO server.");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // --- ¡NUEVO! Listener para la sincronización de reloj ---
      // Cuando un cliente pida la hora, se la enviamos de inmediato.
      socket.on("request-server-time", () => {
        socket.emit("server-time", Date.now());
      });

      socket.on("join-matrix-room", (matrizId: number) => {
        socket.join(`matrix-${matrizId}`);
        console.log(`Client ${socket.id} joined room matrix-${matrizId}`);
      });

      socket.on("start-wave-effect", ({ matrizId, columns }) => {
        // Si ya hay una ola en esta matriz, la detenemos primero
        if (waveIntervals[matrizId]) {
          clearInterval(waveIntervals[matrizId]);
        }

        let currentColumn = 0;
        const colors = ["#c62b28", "#16709f"]; // Rojo, Azul
        const intervalSpeed = 250; // Aumentamos un poco el tiempo entre fotogramas

        waveIntervals[matrizId] = setInterval(() => {
          const room = `matrix-${matrizId}`;
          const color = colors[currentColumn % colors.length];

          // --- ¡LÓGICA DE SINCRONIZACIÓN! ---
          // Calculamos un tiempo futuro para renderizar el fotograma.
          // Este buffer de 200ms da tiempo a que el mensaje llegue a todos los clientes.
          const renderTime = Date.now() + 200;

          io.to(room).emit("wave-update", {
            highlightedColumn: currentColumn,
            color: color,
            renderTime: renderTime, // Enviamos el tiempo de renderizado
          });

          currentColumn++;
          if (currentColumn >= columns) {
            currentColumn = 0; // Reinicia el bucle
          }
        }, intervalSpeed);
      });

      socket.on("stop-wave-effect", ({ matrizId }) => {
        if (waveIntervals[matrizId]) {
          clearInterval(waveIntervals[matrizId]);
          delete waveIntervals[matrizId];
          // Enviamos un último mensaje para apagar la ola en todos los clientes
          const renderTime = Date.now() + 200;
          io.to(`matrix-${matrizId}`).emit("wave-update", {
            highlightedColumn: null,
            color: null,
            renderTime: renderTime,
          });
          console.log(`Wave stopped for matrix ${matrizId}`);
        }
      });

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  res.end();
}
