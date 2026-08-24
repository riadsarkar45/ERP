import { getIO } from "./socket";

export const notify = (socket: any, data: any) => {
    const { senderUserId, userName, message, receiverUserId, type = 'info' } = data || {};

    if (!senderUserId || !receiverUserId || !userName || !message) {
        console.warn("[Notify] Aborted: Missing required fields in payload.", data);
        return;
    }

    const io = getIO();
    const roomName = `user:${String(receiverUserId)}`;
    
    // Debug: Check if anyone is actually in the room
    const room = io.sockets.adapter.rooms.get(roomName);
    const connectedSocketsCount = room?.size || 0;
    
    console.log(`[Notify] Sending to ${roomName}. Connected sockets in this room: ${connectedSocketsCount}`);

    if (connectedSocketsCount === 0) {
        console.warn(`[Notify] ⚠️ Room ${roomName} is empty! The receiver's frontend is not connected to this room.`);
    }

    // Broadcast to the room. Socket.io handles finding the correct socket IDs automatically.
    io.to(roomName).emit("work-order-approval-request", {
        title: `Approval Request from ${userName}`,
        message: message,
        type: type
    });
};