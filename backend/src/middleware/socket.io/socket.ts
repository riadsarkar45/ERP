// socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Hold the singleton instance
let io: SocketIOServer;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "https://erp-three-pied.vercel.app", // Adjust to your frontend URL
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Getter function to safely retrieve the io instance anywhere
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initSocket() first.');
  }
  return io;
};