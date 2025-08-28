// pages/api/socket.ts
import { Server, Socket } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { Server as IOServer } from "socket.io";

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
}

const activeAnimations: Record<string, NodeJS.Timeout> = {};

// --- ¡NUEVO! --- Paleta de colores para la ola
const waveColors = ['#c62b28', '#16709f']; // Rojo, Azul

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log("Socket.IO server is already running.");
  } else {
    console.log("Initializing Socket.IO server...");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);

      socket.on("join-matrix-room", (matrizId: number) => {
        const roomName = `matrix-${matrizId}`;
        socket.join(roomName);
        console.log(`Client ${socket.id} joined room ${roomName}`);
      });

      socket.on("start-wave-effect", ({ matrizId, columns }: { matrizId: number, columns: number }) => {
        const roomName = `matrix-${matrizId}`;
        console.log(`Starting wave effect for room ${roomName}`);

        if (activeAnimations[roomName]) {
          clearInterval(activeAnimations[roomName]);
        }

        let currentStep = 0;
        const totalSteps = columns + 1; 

        const interval = setInterval(() => {
          const columnToSend = currentStep < columns ? currentStep : null;
          
          // --- ¡LÓGICA DE COLOR AÑADIDA! ---
          // Calculamos qué color usar basándonos en si el paso es par o impar.
          const colorIndex = currentStep % waveColors.length;
          const colorToSend = waveColors[colorIndex];

          // Enviamos la columna Y el color.
          io.to(roomName).emit("wave-update", { 
            highlightedColumn: columnToSend,
            color: colorToSend 
          });

          currentStep = (currentStep + 1) % totalSteps;

        }, 1000); // Puedes ajustar la velocidad aquí

        activeAnimations[roomName] = interval;
      });

      socket.on("stop-wave-effect", ({ matrizId }: { matrizId: number }) => {
        const roomName = `matrix-${matrizId}`;
        console.log(`Stopping wave effect for room ${roomName}`);
        if (activeAnimations[roomName]) {
          clearInterval(activeAnimations[roomName]);
          delete activeAnimations[roomName];
          io.to(roomName).emit("wave-update", { highlightedColumn: null, color: null });
        }
      });

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  res.end();
}
