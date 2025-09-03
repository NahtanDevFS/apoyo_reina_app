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

// Definimos la ruta como una constante para asegurar consistencia
const SOCKET_PATH = "/api/socket";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log("Socket.IO server already running.");
  } else {
    console.log("Starting Socket.IO server.");
    // --- ¡CORRECCIÓN CLAVE! ---
    // Se añade la opción `path` al constructor del servidor de Socket.IO.
    // Ahora el servidor y el cliente estarán en la misma "dirección".
    const io = new Server(res.socket.server, {
      path: SOCKET_PATH,
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on("connection", (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on("request-server-time", () => {
        socket.emit("server-time", Date.now());
      });

      socket.on("join-matrix-room", (matrizId: number) => {
        socket.join(`matrix-${matrizId}`);
        console.log(`Client ${socket.id} joined room matrix-${matrizId}`);
      });

      socket.on("start-wave-effect", ({ matrizId, columns }) => {
        if (waveIntervals[matrizId]) {
          clearInterval(waveIntervals[matrizId]);
        }

        let currentColumn = 0;
        const colors = ["#c62b28", "#16709f"];
        const intervalSpeed = 250;

        waveIntervals[matrizId] = setInterval(() => {
          const room = `matrix-${matrizId}`;
          const color = colors[currentColumn % colors.length];
          const renderTime = Date.now() + 200;

          io.to(room).emit("wave-update", {
            highlightedColumn: currentColumn,
            color: color,
            renderTime: renderTime,
          });

          currentColumn++;
          if (currentColumn >= columns) {
            currentColumn = 0;
          }
        }, intervalSpeed);
      });

      socket.on("stop-wave-effect", ({ matrizId }) => {
        if (waveIntervals[matrizId]) {
          clearInterval(waveIntervals[matrizId]);
          delete waveIntervals[matrizId];
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
