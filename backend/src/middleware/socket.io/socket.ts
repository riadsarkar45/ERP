// socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Hold the singleton instance
let io: SocketIOServer;

const normalize = (origin: string) => origin.trim().replace(/\/+$/, '');

export const initSocket = (server: HTTPServer): SocketIOServer => {
  const defaultOrigins = [
    "https://erp-three-pied.vercel.app",
    "https://erp-backend-ruby.vercel.app",
    "http://localhost:5173",
    "http://localhost:8081",
    "http://127.0.0.1:1420",
    "http://localhost:1420",   // tauri dev
    "http://tauri.localhost",  // installed Windows app (MSI)
    "https://tauri.localhost", // if useHttpsScheme is enabled in tauri.conf.json
    "tauri://localhost",
  ];

  // CORS_ORIGIN can be one value or comma-separated; it is ADDED to the list above
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(normalize)
    .filter(Boolean);

  const allowedOrigins = new Set([...defaultOrigins, ...envOrigins].map(normalize));

  console.log('[Socket] Allowed origins:', [...allowedOrigins]);

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // No Origin header (e.g. server-to-server, some native clients): allow
        if (!origin) return callback(null, true);

        if (allowedOrigins.has(normalize(origin))) {
          return callback(null, true);
        }

        console.warn(`[Socket] ❌ Blocked origin: "${origin}"`);
        return callback(new Error(`Origin not allowed: ${origin}`), false);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id} (origin: ${socket.handshake.headers.origin})`);

    // Optional: join a per-user room so you can emit to a specific user
    const authUserId = socket.handshake.auth?.userId;
    if (authUserId) socket.join(`user:${authUserId}`);

    socket.on('register-user', ({ userId }: { userId?: string }) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.id} (${reason})`);
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