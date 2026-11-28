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
  isVisible?: boolean;
  lastInteractionAt?: number;
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
  // Do not collect query strings because they may contain business identifiers.
  const queryIndex = value.indexOf("?");
  const pathname = queryIndex === -1 ? value : value.slice(0, queryIndex);
  return pathname.slice(0, 200);
}

function safeTitle(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "Unknown page";
}

function getSessionStatus(row: Record<string, string>, now: number): string {
  if (row.isVisible !== "true") return "background";
  const lastInteractionAt = Number(row.lastInteractionAt || 0);
  return now - lastInteractionAt <= 60_000 ? "working" : "viewing";
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

  if (!userId || typeof sessionId !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(sessionId)) {
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
    let workingStation = existing.workingStation;

    if (!displayName) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          userName: true,
          userRole: true,
          workingStation: true,
          isActive: true,
        },
      });

      if (!user?.isActive) {
        callback?.({ success: false, message: "User is inactive" });
        return;
      }

      displayName = user.name;
      userRole = user.userRole;
      workingStation = user.workingStation || "";
    }

    const requestedInteractionAt = Number(payload.lastInteractionAt);
    const previousInteractionAt = Number(existing.lastInteractionAt || 0);
    const validNewInteraction =
      Number.isFinite(requestedInteractionAt) &&
      requestedInteractionAt <= now &&
      requestedInteractionAt >= now - 120_000;
    const lastInteractionAt = validNewInteraction
      ? Math.max(previousInteractionAt, requestedInteractionAt)
      : previousInteractionAt || now - 120_000;

    const fields = {
      userId: String(userId),
      displayName: displayName || "Unknown user",
      userRole: userRole || "",
      workingStation: workingStation || "",
      path: safePath(payload.path),
      pageTitle: safeTitle(payload.pageTitle),
      isVisible: payload.isVisible === false ? "false" : "true",
      lastSeenAt: String(now),
      lastInteractionAt: String(lastInteractionAt),
    };

    const pipeline = redis.pipeline();
    pipeline.hset(key, fields);
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
      INDEX_KEY,
      minScore,
      "+inf",
      "LIMIT",
      0,
      MAX_RETURNED_SESSIONS
    );

    if (!members.length) {
      return {
        success: true,
        generatedAt: new Date(now).toISOString(),
        sessions: [],
        summary: { total: 0, working: 0, viewing: 0, background: 0, modules: 0 },
      };
    }

    const pipeline = redis.pipeline();
    for (const member of members) {
      pipeline.hgetall(`${SESSION_PREFIX}${member}`);
    }
    const results = await pipeline.exec();

    const sessions = (results || [])
      .map((result, index) => {
        const row = result?.[1] as Record<string, string> | undefined;
        if (!row || !row.userId) return null;

        const status = getSessionStatus(row, now);
        return {
          sessionKey: members[index],
          userId: Number(row.userId),
          name: row.displayName || "Unknown user",
          role: row.userRole || "",
          workingStation: row.workingStation || "",
          page: row.pageTitle || "Unknown page",
          path: row.path || "/",
          status,
          lastSeenAt: new Date(Number(row.lastSeenAt || now)).toISOString(),
          lastInteractionAt: new Date(Number(row.lastInteractionAt || now)).toISOString(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

    const moduleCounts = new Set(sessions.map(session => session.page));
    const summary = {
      total: sessions.length,
      working: sessions.filter(session => session.status === "working").length,
      viewing: sessions.filter(session => session.status === "viewing").length,
      background: sessions.filter(session => session.status === "background").length,
      modules: moduleCounts.size,
    };

    return {
      success: true,
      generatedAt: new Date(now).toISOString(),
      sessions,
      summary,
    };
  } catch (error) {
    console.error("[UserActivity] Snapshot failed:", error instanceof Error ? error.message : error);
    return { success: false, message: "Unable to load live user activity", sessions: [], summary: null };
  }
}

export function initUserActivityMonitor(): void {
  const io = getIO();
  io.on("connection", (socket: Socket) => {
    socket.on(
      "monitoring:user-activity:heartbeat",
      (payload: HeartbeatPayload, callback?: ActivityCallback) => {
        void handleHeartbeat(payload || {}, callback);
      }
    );

    socket.on(
      "monitoring:user-activity:request",
      async (payload: { token?: string }, callback?: ActivityCallback) => {
        const result = await getActivitySnapshot(payload?.token);
        callback?.(result);
      }
    );
  });

  console.log("[UserActivity] Live user activity monitoring initialized");
}

