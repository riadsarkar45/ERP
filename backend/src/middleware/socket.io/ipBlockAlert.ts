// middleware/socket.io/ipBlockAlert.ts
import { getIO } from "./socket";

interface IpBlockAlertData {
  route: string;
  ip: string;
  totalBlocked: number;
  userId: string | number | null;
}

const ALERT_COOLDOWN_MS = 30_000; // one alert per user per 30s, no matter the request rate
const lastAlertAt = new Map<string, number>(); // key: `${userId}:${ip}`

export const ipBlockAlert = (reqData: IpBlockAlertData) => {
  if (!reqData || Object.keys(reqData).length === 0) return;

  const { route, ip, totalBlocked, userId } = reqData;
  if (userId === null || userId === undefined) return;

  const key = `${userId}:${ip}`;
  const now = Date.now();
  const last = lastAlertAt.get(key) ?? 0;

  if (now - last < ALERT_COOLDOWN_MS) {
    return; // still within cooldown — skip the emit, but metrics.blocked keeps counting upstream
  }
  lastAlertAt.set(key, now);

  const io = getIO();
  if (!io) return;

  const roomName = `user:${String(userId)}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room || room.size === 0) return;

  io.to(roomName).emit("ip-block-alert", {
    title: "IP Block Alert",
    message: `IP ${ip} has been blocked from ${route}. Total blocked requests: ${totalBlocked}.`,
    type: "error",
    ip,
    route,
  });
};