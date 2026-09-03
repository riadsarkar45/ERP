// middleware/socket.io/notify.ts
import { getIO } from "./socket";

interface QueuedNotification {
  title: string;
  message: string;
  type: string;
  timestamp: number;
}

const MAX_QUEUED_PER_USER = 20; // cap so an offline user doesn't accumulate unbounded notifications
const pendingNotifications = new Map<string, QueuedNotification[]>(); // key: `${receiverUserId}`

function queueNotification(userId: string, notif: QueuedNotification) {
  const existing = pendingNotifications.get(userId) ?? [];
  existing.push(notif);
  if (existing.length > MAX_QUEUED_PER_USER) {
    existing.shift(); // drop oldest so it doesn't grow forever
  }
  pendingNotifications.set(userId, existing);
}

export const notify = (socket: any, data: any) => {
    const { senderUserId, userName, message, receiverUserId, type = 'info' } = data || {};

    if (!senderUserId || !receiverUserId || !userName || !message) {
        console.warn("[Notify] Aborted: Missing required fields in payload.", data);
        return;
    }

    const io = getIO();
    const receiverIdStr = String(receiverUserId);
    const roomName = `user:${receiverIdStr}`;

    // Debug: Check if anyone is actually in the room
    const room = io.sockets.adapter.rooms.get(roomName);
    const connectedSocketsCount = room?.size || 0;

    console.log(`[Notify] Sending to ${roomName}. Connected sockets in this room: ${connectedSocketsCount}`);

    const payload: QueuedNotification = {
        title: `Approval Request from ${userName}`,
        message: message,
        type: type,
        timestamp: Date.now(),
    };

    if (connectedSocketsCount === 0) {
        console.warn(`[Notify] ⚠️ Room ${roomName} is empty! Queuing notification for when the receiver reconnects.`);
        queueNotification(receiverIdStr, payload);
        return;
    }

    // Broadcast to the room. Socket.io handles finding the correct socket IDs automatically.
    io.to(roomName).emit("work-order-approval-request", payload);
};

// Call this the moment a user's socket joins their room, so anything that
// piled up while they were offline gets delivered instantly on (re)connect.
export const flushPendingNotifications = (userId: string | number) => {
  const userIdStr = String(userId);
  const notifications = pendingNotifications.get(userIdStr);
  if (!notifications || notifications.length === 0) return;

  const io = getIO();
  if (!io) return;

  const roomName = `user:${userIdStr}`;
  for (const notif of notifications) {
    io.to(roomName).emit("work-order-approval-request", notif);
  }
  pendingNotifications.delete(userIdStr);
};