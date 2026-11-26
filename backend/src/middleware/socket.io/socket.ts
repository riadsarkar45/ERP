import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  const corsOrigins = [
    "https://erp-three-pied.vercel.app",
    "https://erp-backend-ruby.vercel.app",
    "http://localhost:5173",
    "http://localhost:8081",
    "http://127.0.0.1:1420",
    "http://localhost:1420",
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost",
  ];

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", socket => {
    console.log(`✅ User connected: ${socket.id}`);

    // The application owner will apply their preferred authorization policy here.
    socket.on("monitoring:subscribe", () => {
      void socket.join("monitoring:admins");
    });
    socket.on("monitoring:unsubscribe", () => {
      void socket.leave("monitoring:admins");
    });

    socket.on("joinRoom", async (roomId: string, callback) => {
      try {
        if (typeof roomId !== "string" || !roomId.trim()) {
          callback?.({ success: false, message: "Invalid room ID" });
          return;
        }
        await socket.join(roomId);
        callback?.({ success: true, roomId });
      } catch (error) {
        console.error("[Socket] joinRoom error:", error);
        callback?.({ success: false, message: "Failed to join room" });
      }
    });

    socket.on("leaveRoom", async (roomId: string) => {
      if (typeof roomId !== "string" || !roomId.trim()) return;
      await socket.leave(roomId);
    });

    socket.on("disconnect", reason => {
      console.log(`❌ User disconnected: ${socket.id}`, reason);
    });
  });

  console.log("🚀 Socket.IO initialized successfully");
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error("Socket.io not initialized! Call initSocket() first.");
  return io;
};
