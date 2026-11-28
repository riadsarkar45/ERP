import type { Socket } from "socket.io";
import prisma from "../database/prismaClient/prisma";
import redis from "../redis/connect.redis";
import { verifyAccessToken } from "../utils/auth/token.util";
import { getIO } from "../middleware/socket.io/socket";

const INDEX_KEY = "sm-erp:user-activity:sessions:v1";
const SESSION_PREFIX = "sm-erp:user-activity:session:v1:";
const SESSION_TTL_SECONDS = 90;
const MAX_RETURNED_SESSIONS = 1000;
const ADMIN_ROLES = new Set(["ADMIN", "SUPER ADMIN"]);

type HeartbeatPayload = {
  token?: string;
  sessionId?: string;
  path?: string;
  pageTitle?: string;
};

type ActivityCallback = (result: Record<string, unknown>) => void;

function getTokenUserId(token: unknown): number | null {
  if (typeof token !== "string" || !token) return null;
  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.userId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

async function isAuthorizedMonitor(token: unknown): Promise<boolean> {
  const userId = getTokenUserId(token);
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, userRole: true },
  });

  return Boolean(
    user?.isActive &&
    ADMIN_ROLES.has(String(user.userRole || "").trim().toUpperCase())
  );
}

function safePath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const queryIndex = value.indexOf("?");
  const pathname = queryIndex === -1 ? value : value.slice(0, queryIndex);
  return pathname.slice(0, 200);
}

function safeTitle(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 100)
    : "Unknown page";
}

function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(value);
}

async function removeSession(userId: number, sessionId: string): Promise<void> {
  const member = `${userId}:${sessionId}`;
  const pipeline = redis.pipeline();
  pipeline.del(`${SESSION_PREFIX}${member}`);
  pipeline.zrem(INDEX_KEY, member);
  await pipeline.exec();
}

async function handleHeartbeat(
  payload: HeartbeatPayload,
  callback?: ActivityCallback
): Promise<void> {
  if (redis.status !== "ready") {
    callback?.({ success: false, message: "Live activity storage is unavailable" });
    return;
  }

  const userId = getTokenUserId(payload?.token);
  const sessionId = payload?.sessionId;

  if (!userId || !isValidSessionId(sessionId)) {
    callback?.({ success: false, message: "Invalid or expired session" });
    return;
  }

  const member = `${userId}:${sessionId}`;
  const key = `${SESSION_PREFIX}${member}`;
  const now = Date.now();

  try {
    const existing = await redis.hgetall(key);
    let displayName = existing.displayName;
    let userRole = existing.userRole;

    if (!displayName) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, userName: true, userRole: true, isActive: true },
      });

      if (!user?.isActive) {
        callback?.({ success: false, message: "User is inactive" });
        return;
      }

      displayName = user.name || user.userName || "Unknown user";
      userRole = Array.isArray(user.userRole)
        ? user.userRole.join(", ")
        : String(user.userRole || "");
    }

    const pipeline = redis.pipeline();
    pipeline.hset(key, {
      userId: String(userId),
      displayName: displayName || "Unknown user",
      userRole: userRole || "",
      path: safePath(payload.path),
      pageTitle: safeTitle(payload.pageTitle),
      lastSeenAt: String(now),
    });
    pipeline.expire(key, SESSION_TTL_SECONDS);
    pipeline.zadd(INDEX_KEY, now, member);
    pipeline.zremrangebyscore(INDEX_KEY, "-inf", now - SESSION_TTL_SECONDS * 1000);
    await pipeline.exec();

    callback?.({ success: true, timestamp: new Date(now).toISOString() });
  } catch (error) {
    console.error("[UserActivity] Heartbeat failed:", error instanceof Error ? error.message : error);
    callback?.({ success: false, message: "Unable to update activity" });
  }
}

async function handleClose(
  payload: { token?: string; sessionId?: string },
  callback?: ActivityCallback
): Promise<void> {
  const userId = getTokenUserId(payload?.token);
  if (!userId || !isValidSessionId(payload?.sessionId)) {
    callback?.({ success: false, message: "Invalid session" });
    return;
  }
  if (redis.status !== "ready") {
    callback?.({ success: false, message: "Live activity storage is unavailable" });
    return;
  }

  try {
    await removeSession(userId, payload.sessionId);
    callback?.({ success: true });
  } catch (error) {
    console.error("[UserActivity] Session close failed:", error instanceof Error ? error.message : error);
    callback?.({ success: false, message: "Unable to close session" });
  }
}

async function handleLogout(
  payload: { token?: string; sessionIds?: string[] },
  callback?: ActivityCallback
): Promise<void> {
  const userId = getTokenUserId(payload?.token);
  if (!userId || !Array.isArray(payload?.sessionIds)) {
    callback?.({ success: false, message: "Invalid session" });
    return;
  }
  if (redis.status !== "ready") {
    callback?.({ success: false, message: "Live activity storage is unavailable" });
    return;
  }

  try {
    const sessionIds = payload.sessionIds.filter(isValidSessionId).slice(0, 30);
    await Promise.all(sessionIds.map(sessionId => removeSession(userId, sessionId)));
    callback?.({ success: true });
  } catch (error) {
    console.error("[UserActivity] Logout cleanup failed:", error instanceof Error ? error.message : error);
    callback?.({ success: false, message: "Unable to clear user sessions" });
  }
}

async function getActivitySnapshot(token: unknown) {
  try {
    if (!(await isAuthorizedMonitor(token))) {
      return { success: false, message: "Administrator access required", sessions: [], summary: null };
    }
  } catch (error) {
    console.error("[UserActivity] Authorization check failed:", error instanceof Error ? error.message : error);
    return { success: false, message: "Unable to authorize monitoring request", sessions: [], summary: null };
  }

  if (redis.status !== "ready") {
    return { success: false, message: "Live activity storage is unavailable", sessions: [], summary: null };
  }

  const now = Date.now();
  const minScore = now - SESSION_TTL_SECONDS * 1000;

  try {
    const members = await redis.zrangebyscore(
      INDEX_KEY, minScore, "+inf", "LIMIT", 0, MAX_RETURNED_SESSIONS
    );

    if (!members.length) {
      return {
        success: true,
        generatedAt: new Date(now).toISOString(),
        sessions: [],
        summary: { total: 0 },
      };
    }

    const pipeline = redis.pipeline();
    for (const member of members) pipeline.hgetall(`${SESSION_PREFIX}${member}`);
    const results = await pipeline.exec();

    const sessions = (results || [])
      .map((result, index) => {
        const row = result?.[1] as Record<string, string> | undefined;
        if (!row?.userId) return null;
        return {
          sessionKey: members[index],
          userId: Number(row.userId),
          name: row.displayName || "Unknown user",
          role: row.userRole || "",
          page: row.pageTitle || "Unknown page",
          path: row.path || "/",
          lastSeenAt: new Date(Number(row.lastSeenAt || now)).toISOString(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

    return {
      success: true,
      generatedAt: new Date(now).toISOString(),
      sessions,
      summary: { total: sessions.length },
    };
  } catch (error) {
    console.error("[UserActivity] Snapshot failed:", error instanceof Error ? error.message : error);
    return { success: false, message: "Unable to load live user activity", sessions: [], summary: null };
  }
}

/**
 * Remove only live user-page session keys. System-monitor history uses a
 * different Redis key and is deliberately preserved.
 */
async function clearLiveUserSessionsAtMidnight(): Promise<void> {
  if (redis.status !== "ready") {
    console.warn("[UserActivity] Midnight cleanup skipped: Redis is unavailable");
    return;
  }

  try {
    const members = await redis.zrange(INDEX_KEY, 0, -1);
    const pipeline = redis.pipeline();
    for (const member of members) pipeline.del(`${SESSION_PREFIX}${member}`);
    pipeline.del(INDEX_KEY);
    await pipeline.exec();
    console.log(`[UserActivity] Midnight cleanup completed: ${members.length} live sessions cleared`);
  } catch (error) {
    console.error("[UserActivity] Midnight cleanup failed:", error instanceof Error ? error.message : error);
  }
}

let midnightCleanupTimer: NodeJS.Timeout | null = null;

function scheduleNextDhakaMidnight(): void {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);

  // Bangladesh uses UTC+06:00. Calculate the next local midnight as UTC.
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 6 * 60 * 60 * 1000;
  const delay = Math.max(1000, nextMidnightUtc - now.getTime());

  midnightCleanupTimer = setTimeout(async () => {
    await clearLiveUserSessionsAtMidnight();
    scheduleNextDhakaMidnight();
  }, delay);
  midnightCleanupTimer.unref();
}

export function initUserActivityMonitor(): void {
  const io = getIO();
  io.on("connection", (socket: Socket) => {
    socket.on("monitoring:user-activity:heartbeat", (payload: HeartbeatPayload, callback?: ActivityCallback) => {
      void handleHeartbeat(payload || {}, callback);
    });

    socket.on("monitoring:user-activity:close", (payload: { token?: string; sessionId?: string }, callback?: ActivityCallback) => {
      void handleClose(payload || {}, callback);
    });

    socket.on("monitoring:user-activity:logout", (payload: { token?: string; sessionIds?: string[] }, callback?: ActivityCallback) => {
      void handleLogout(payload || {}, callback);
    });

    socket.on("monitoring:user-activity:request", async (payload: { token?: string }, callback?: ActivityCallback) => {
      const result = await getActivitySnapshot(payload?.token);
      callback?.(result);
    });
  });

  if (!midnightCleanupTimer) scheduleNextDhakaMidnight();
  console.log("[UserActivity] Simple live page tracking initialized; daily cleanup scheduled for 00:00 Asia/Dhaka");
}
