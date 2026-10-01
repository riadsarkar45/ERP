import { Socket } from "socket.io";
import { handleYarnLotSelection, handleYarnLotClear, handleYarnLotDisconnect } from "../middleware/socket.io/handleYarnLotSelection";
import { flushPendingNotifications, notify } from "../middleware/socket.io/notify";
import { getIO } from "../middleware/socket.io/socket";
import { flushPendingAlerts } from "../middleware/socket.io/ipBlockAlert";
import { getOnlineAndOfflineUsers, getOnlineUsers } from "../middleware/socket.io/get.online.offline.user";

interface CustomSocketData {
    userId?: string;
}

export const initSocketRoutes = () => {
    const io = getIO();

    io.on("connection", (socket: Socket<any, any, any, CustomSocketData>) => {
        console.log(`Socket connected: ${socket.id}`);

        const joinRoom = (userId: string | number) => {
            if (!userId) return;

            const id = String(userId);
            const roomName = `user:${id}`;

            // Avoid duplicate registrations
            if (socket.rooms.has(roomName)) return;

            socket.data.userId = id;
            socket.join(roomName);
            console.log(`✅ User ${id} joined room ${roomName}`);

            // Deliver queued offline data
            flushPendingAlerts(id);
            flushPendingNotifications(id);

            // Broadcast updated online status to all connected clients
            broadcastOnlineUsers();
        };

        const broadcastOnlineUsers = async () => {
            const onlineUsers = await getOnlineUsers();
            io.emit("online-users-updated", { onlineUsers });
        };

        // --- 1. Handshake Auth Check ---
        const authUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
        if (authUserId) joinRoom(authUserId);

        // --- 2. User Registration Socket Event ---
        socket.on("register-user", (data: any) => {
            if (data?.userId) joinRoom(data.userId);
        });

        // --- 3. Request Online Users List (Request-Response over Socket) ---
        socket.on("get-online-users", async (callback: any) => {
            const onlineUsers = await getOnlineUsers();
            if (typeof callback === "function") {
                callback({ success: true, onlineUsers });
            } else {
                socket.emit("response-online-users", { onlineUsers });
            }
        });

        // --- 4. Request Both Online and Offline Users ---
        socket.on("get-online-offline-users", async (data: { allUserIds: (string | number)[] }, callback: any) => {
            const allUserIds = data?.allUserIds || [];
            const result = await getOnlineAndOfflineUsers(allUserIds);

            if (typeof callback === "function") {
                callback({ success: true, ...result });
            } else {
                socket.emit("response-online-offline-users", result);
            }
        });

        // --- 5. Custom Business Socket Events ---
        socket.on("yarn-lot-selected", (data: any) => {
            if (data?.userId) joinRoom(data.userId);
            handleYarnLotSelection(socket, data);
        });

        socket.on("notify-work-order-request", (data: any) => {
            console.log("[Route] Received notify-work-order-request:", data);
            if (!data) return;
            notify(socket, data);
        });

        socket.on("yarn-lot-cleared", (data: any) => {
            handleYarnLotClear(socket, data);
        });

        // --- 6. Disconnect Event ---
        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected: ${socket.id} (${reason})`);
            
            if (socket.data.userId) {
                handleYarnLotDisconnect(socket, socket.data.userId);
            }

            // Broadcast updated online list after disconnection
            broadcastOnlineUsers();
        });
    });
};