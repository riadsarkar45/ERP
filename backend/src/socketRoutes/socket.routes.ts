import { handleYarnLotSelection, handleYarnLotClear, handleYarnLotDisconnect } from "../middleware/socket.io/handleYarnLotSelection";
import { flushPendingNotifications, notify } from "../middleware/socket.io/notify";
import { getIO } from "../middleware/socket.io/socket";
import { flushPendingAlerts } from "../middleware/socket.io/ipBlockAlert";

export const initSocketRoutes = () => {
    const io = getIO();

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        const joinRoom = (userId: string | number) => {
            const id = String(userId);
            socket.data.userId = id;
            socket.join(`user:${id}`);
            console.log(`✅ User ${id} joined room user:${id}`);
            flushPendingAlerts(id); // deliver anything queued while this user was offline
            flushPendingNotifications(id); // deliver any queued notifications while this user was offline
        };

        // 1. Try to get userId from initial handshake
        const authUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
        if (authUserId) joinRoom(authUserId);

        // 2. Fallback if frontend sends it slightly after connection
        socket.on("register-user", (data) => {
            if (data?.userId) joinRoom(data.userId);
        });

        socket.on("yarn-lot-selected", (data) => {
            if (data?.userId) joinRoom(data.userId);
            handleYarnLotSelection(socket, data);
        });

        socket.on("notify-work-order-request", (data) => {
            console.log("[Route] Received notify-work-order-request:", data);
            if (!data) return;
            notify(socket, data);
        });

        socket.on("yarn-lot-cleared", (data) => {
            handleYarnLotClear(socket, data);
        });

        socket.on("disconnect", (reason) => {
            console.log(`Socket disconnected: ${socket.id} (${reason})`);
            handleYarnLotDisconnect(socket, socket.data.userId);
        });
    });
};