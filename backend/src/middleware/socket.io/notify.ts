// middleware/socket.io/notify.ts
import { getIO } from "./socket";

interface QueuedNotification {
  title: string;
  message: string;
  type: string;
  timestamp: number;
}

const MAX_QUEUED_PER_USER = 20; // cap so an offline user doesn't accumulate unbounded notifications
const FLUSH_DELAY_MS = 15_000; // wait for client to mount/attach listener before flushing backlog
const BETWEEN_NOTIF_DELAY_MS = 2_000; // stagger multiple queued notifications so they don't all land at once

const pendingNotifications = new Map<string, QueuedNotification[]>(); // key: `${receiverUserId}`
const pendingFlushTimers = new Map<string, NodeJS.Timeout>(); // key: `${receiverUserId}`

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
    if (!io) {
        console.warn("[Notify] Aborted: io is not initialized.");
        return;
    }

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

// Emits queued notifications one at a time, BETWEEN_NOTIF_DELAY_MS apart,
// instead of dumping them all in the same tick. Re-checks room membership
// before each emit in case the user disconnects partway through.
function drainQueue(userIdStr: string, notifications: QueuedNotification[], index: number) {
    if (index >= notifications.length) {
        pendingNotifications.delete(userIdStr);
        return;
    }

    const io = getIO();
    if (!io) return;

    const roomName = `user:${userIdStr}`;
    const room = io.sockets.adapter.rooms.get(roomName);

    if (!room || room.size === 0) {
        // Disconnected mid-drain — leave whatever's left (from this index on) queued.
        pendingNotifications.set(userIdStr, notifications.slice(index));
        console.warn(`[Notify] User ${userIdStr} disconnected mid-flush — ${notifications.length - index} notification(s) left queued.`);
        return;
    }

    io.to(roomName).emit("work-order-approval-request", notifications[index]);

    setTimeout(() => {
        drainQueue(userIdStr, notifications, index + 1);
    }, BETWEEN_NOTIF_DELAY_MS);
}

// Call this the moment a user's socket joins their room. Waits FLUSH_DELAY_MS
// before starting to flush so the client has time to mount and attach its
// listener, then emits any queued notifications one at a time, spaced
// BETWEEN_NOTIF_DELAY_MS apart.
export const flushPendingNotifications = (userId: string | number) => {
  const userIdStr = String(userId);

  // If a flush is already scheduled for this user (e.g. rapid reconnects),
  // don't stack timers — just let the existing one run.
  if (pendingFlushTimers.has(userIdStr)) return;

  const timer = setTimeout(() => {
    pendingFlushTimers.delete(userIdStr);

    const notifications = pendingNotifications.get(userIdStr);
    if (!notifications || notifications.length === 0) return;

    console.log(`[Notify] Flushing ${notifications.length} queued notification(s) for user ${userIdStr}, spaced ${BETWEEN_NOTIF_DELAY_MS}ms apart.`);

    // Take a snapshot so new notifications queued during the drain (e.g. a
    // fresh notify() call while flushing) aren't accidentally consumed twice.
    pendingNotifications.delete(userIdStr);
    drainQueue(userIdStr, notifications, 0);
  }, FLUSH_DELAY_MS);

  pendingFlushTimers.set(userIdStr, timer);
};