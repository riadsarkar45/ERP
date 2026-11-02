
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

    io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.id}`);

        // Join a room
        socket.on("joinRoom", async (roomId: string, callback) => {
            console.log("[Socket] joinRoom received:", {
                socketId: socket.id,
                roomId,
                hasCallback: typeof callback === "function",
            });

            try {
                if (
                    typeof roomId !== "string" ||
                    !roomId.trim()
                ) {
                    callback?.({
                        success: false,
                        message: "Invalid room ID",
                    });
                    return;
                }

                await socket.join(roomId);

                console.log("[Socket] Room joined successfully:", {
                    socketId: socket.id,
                    roomId,
                    rooms: Array.from(socket.rooms),
                });

                callback?.({
                    success: true,
                    roomId,
                });
            } catch (error) {
                console.error("[Socket] joinRoom error:", error);

                callback?.({
                    success: false,
                    message: "Failed to join room",
                });
            }
        });

        // Leave a room
        socket.on("leaveRoom", async (roomId: string) => {
            try {
                if (
                    typeof roomId !== "string" ||
                    !roomId.trim()
                ) {
                    return;
                }

                await socket.leave(roomId);

                console.log("[Socket] Room left:", {
                    socketId: socket.id,
                    roomId,
                });
            } catch (error) {
                console.error("[Socket] leaveRoom error:", error);
            }
        });

        socket.on("disconnect", (reason) => {
            console.log(`❌ User disconnected: ${socket.id}`, reason);
        });
    });

    console.log("🚀 Socket.IO initialized successfully");

    return io;
};

export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error(
            "Socket.io not initialized! Call initSocket() first."
        );
    }

    return io;
};
