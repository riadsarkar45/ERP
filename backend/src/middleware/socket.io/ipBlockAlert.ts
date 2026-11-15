
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

const ALERT_COOLDOWN_MS = 30_000;
const MAX_QUEUED_PER_USER = 20;

const lastAlertAt = new Map<string, number>();

const pendingAlerts = new Map<string, QueuedAlert[]>();

function buildAlert(
  route: string,
  ip: string,
  totalBlocked: number
): QueuedAlert {
  return {
    title: "IP Block Alert",
    message: `IP ${ip} has been blocked from ${route}. Total blocked requests: ${totalBlocked}.`,
    type: "error",
    ip,
    route,
    timestamp: Date.now(),
  };
}

function queueAlert(userId: string, alert: QueuedAlert): void {
  const existing = pendingAlerts.get(userId) ?? [];

  existing.push(alert);

  if (existing.length > MAX_QUEUED_PER_USER) {
    existing.shift();
  }

  pendingAlerts.set(userId, existing);
}

export const ipBlockAlert = (
  reqData: IpBlockAlertData
): void => {
  if (!reqData || reqData.userId == null) return;

  const { route, ip, totalBlocked, userId } = reqData;

  const userIdStr = String(userId);
  const key = `${userIdStr}:${ip}`;

  const now = Date.now();
  const last = lastAlertAt.get(key) ?? 0;

  if (now - last < ALERT_COOLDOWN_MS) return;

  const alert = buildAlert(route, ip, totalBlocked);

  const io = getIO();

  const roomName = `user:${userIdStr}`;
  const room = io?.sockets.adapter.rooms.get(roomName);

  if (!io || !room || room.size === 0) {
    queueAlert(userIdStr, alert);

    // Do not consume cooldown while the alert is only queued.
    return;
  }

  lastAlertAt.set(key, now);

  io.to(roomName).emit("ip-block-alert", alert);
};

export const flushPendingAlerts = (
  userId: string | number
): void => {
  const userIdStr = String(userId);

  const alerts = pendingAlerts.get(userIdStr);

  if (!alerts || alerts.length === 0) return;

  const io = getIO();

  if (!io) return;

  const roomName = `user:${userIdStr}`;
  const room = io.sockets.adapter.rooms.get(roomName);

  if (!room || room.size === 0) return;

  for (const alert of alerts) {
    io.to(roomName).emit("ip-block-alert", alert);
  }

  pendingAlerts.delete(userIdStr);
};
