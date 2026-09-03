// middleware/socket.io/ipBlockAlert.ts
import { getIO } from "./socket";

interface IpBlockAlertData {
  route: string;
  ip: string;
  totalBlocked: number;
  userId: string | number | null;
}

interface QueuedAlert {
  title: string;
  message: string;
  type: string;
  ip: string;
  route: string;
  timestamp: number;
}

const ALERT_COOLDOWN_MS = 30_000; // one alert per user per 30s, no matter the request rate
const MAX_QUEUED_PER_USER = 20; // cap so an offline user doesn't accumulate unbounded alerts

const lastAlertAt = new Map<string, number>(); // key: `${userId}:${ip}`
const pendingAlerts = new Map<string, QueuedAlert[]>(); // key: `${userId}`

function buildAlert(route: string, ip: string, totalBlocked: number): QueuedAlert {
  return {
    title: "IP Block Alert",
    message: `IP ${ip} has been blocked from ${route}. Total blocked requests: ${totalBlocked}.`,
    type: "error",
    ip,
    route,
    timestamp: Date.now(),
  };
}

function queueAlert(userId: string, alert: QueuedAlert) {
  const existing = pendingAlerts.get(userId) ?? [];
  existing.push(alert);
  if (existing.length > MAX_QUEUED_PER_USER) {
    existing.shift(); // drop oldest so it doesn't grow forever
  }
  pendingAlerts.set(userId, existing);
}

export const ipBlockAlert = (reqData: IpBlockAlertData) => {
  if (!reqData || Object.keys(reqData).length === 0) return;

  const { route, ip, totalBlocked, userId } = reqData;
  if (userId === null || userId === undefined) return;

  const key = `${userId}:${ip}`;
  const now = Date.now();
  const last = lastAlertAt.get(key) ?? 0;

  if (now - last < ALERT_COOLDOWN_MS) {
    return; // still within cooldown — metrics.blocked keeps counting upstream
  }
  lastAlertAt.set(key, now);

  const alert = buildAlert(route, ip, totalBlocked);
  const userIdStr = String(userId);

  const io = getIO();
  const roomName = `user:${userIdStr}`;
  const room = io?.sockets.adapter.rooms.get(roomName);

  if (!io || !room || room.size === 0) {
    // user isn't connected right now — queue it instead of dropping it
    queueAlert(userIdStr, alert);
    return;
  }

  io.to(roomName).emit("ip-block-alert", alert);
};

// Call this the moment a user's socket joins their room, so anything that
// piled up while they were offline gets delivered instantly on (re)connect.
export const flushPendingAlerts = (userId: string | number) => {
  const userIdStr = String(userId);
  const alerts = pendingAlerts.get(userIdStr);
  if (!alerts || alerts.length === 0) return;

  const io = getIO();
  if (!io) return;

  const roomName = `user:${userIdStr}`;
  for (const alert of alerts) {
    io.to(roomName).emit("ip-block-alert", alert);
  }
  pendingAlerts.delete(userIdStr);
};