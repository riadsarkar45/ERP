import os from "node:os";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import v8 from "node:v8";
import prisma from "../database/prismaClient/prisma";
import { verifyAccessToken } from "../utils/auth/token.util";
import redis from "../redis/connect.redis";
import { getIO } from "../middleware/socket.io/socket";
import { metrics } from "../middleware/rateLimiter/metrics";

const ROOM = "monitoring:admins";
const SAMPLE_MS = 5000;
const processStartedAt = new Date();
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();
let timer: NodeJS.Timeout | null = null;
let previousCpu = process.cpuUsage();
let previousCpuAt = performance.now();
let previousRequestSampleAt = performance.now();
let previousAllowedCount = 0;

const database = {
  status: "unavailable" as "connected" | "unavailable",
  latencyMs: null as number | null,
  activeSessions: null as number | null,
  idleSessions: null as number | null,
  totalSessions: null as number | null,
  waitingSessions: null as number | null,
  longestActiveQuerySeconds: null as number | null,
  sampledAt: null as string | null,
};


async function sampleDatabase(): Promise<void> {
  const started = performance.now();
  try {
    const rows = await prisma.$queryRaw<Array<{ active: number; idle: number; total: number; waiting: number; longestActiveSeconds: number | null }>>`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active')::int AS active,
        COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL)::int AS waiting,
        MAX(EXTRACT(EPOCH FROM (now() - query_start))) FILTER (WHERE state = 'active' AND query_start IS NOT NULL)::float8 AS "longestActiveSeconds"
      FROM pg_stat_activity WHERE datname = current_database()
    `;
    const row = rows[0];
    database.status = "connected";
    database.latencyMs = Number((performance.now() - started).toFixed(2));
    database.activeSessions = row?.active ?? 0;
    database.idleSessions = row?.idle ?? 0;
    database.totalSessions = row?.total ?? 0;
    database.waitingSessions = row?.waiting ?? 0;
    database.longestActiveQuerySeconds = row?.longestActiveSeconds == null ? null : Number(row.longestActiveSeconds.toFixed(2));
  } catch (error) {
    database.status = "unavailable";
    database.latencyMs = Number((performance.now() - started).toFixed(2));
    database.activeSessions = database.idleSessions = database.totalSessions = database.waitingSessions = database.longestActiveQuerySeconds = null;
    console.warn("[SystemMonitor] DB sample failed:", error instanceof Error ? error.message : error);
  }
  database.sampledAt = new Date().toISOString();
}

function createSnapshot() {
  const now = performance.now();
  const requestElapsedSeconds = Math.max((now - previousRequestSampleAt) / 1000, 0.001);
  const requestRatePerSecond = (metrics.allowed - previousAllowedCount) / requestElapsedSeconds;
  previousRequestSampleAt = now;
  previousAllowedCount = metrics.allowed;
  const elapsedMicros = Math.max((now - previousCpuAt) * 1000, 1);
  const delta = process.cpuUsage(previousCpu);
  const cpuCores = Math.max(os.cpus().length, 1);
  const cpuPercent = Math.min(100, Math.max(0, ((delta.user + delta.system) / elapsedMicros / cpuCores) * 100));
  previousCpu = process.cpuUsage();
  previousCpuAt = now;
  const memory = process.memoryUsage();
  const heap = v8.getHeapStatistics();
  const load = os.loadavg();
  const eventLoopMetrics = {
    mean: Number((eventLoop.mean / 1e6 || 0).toFixed(2)),
    p95: Number((eventLoop.percentile(95) / 1e6 || 0).toFixed(2)),
    max: Number((eventLoop.max / 1e6 || 0).toFixed(2)),
  };
  eventLoop.reset();

  return {
    timestamp: new Date().toISOString(),
    server: {
      status: "online" as const,
      processStartedAt: processStartedAt.toISOString(),
      processUptimeSeconds: Math.floor(process.uptime()),
      hostUptimeSeconds: Math.floor(os.uptime()),
      hostname: os.hostname(), platform: process.platform, architecture: process.arch, nodeVersion: process.version,
      deployment: {
        provider: process.env.RENDER ? "Render" : "Unknown / self-hosted",
        serviceId: process.env.RENDER_SERVICE_ID ?? null,
        instanceId: process.env.RENDER_INSTANCE_ID ?? null,
        gitCommit: process.env.RENDER_GIT_COMMIT ?? null,
      },
      processCpuPercent: Number(cpuPercent.toFixed(1)), cpuCores,
      loadAverage: { oneMinute: load[0] ?? 0, fiveMinutes: load[1] ?? 0, fifteenMinutes: load[2] ?? 0 },
      processMemoryBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal,
      heapLimitBytes: heap.heap_size_limit, externalMemoryBytes: memory.external, arrayBuffersBytes: memory.arrayBuffers,
      eventLoopDelayMs: eventLoopMetrics,
    },
    requests: {
      active: metrics.activeRequests, totalAllowed: metrics.allowed, totalBlocked: metrics.blocked,
      requestsPerSecond: Number(Math.max(0, requestRatePerSecond).toFixed(2)),
      routes: Array.from(metrics.byRoute.entries()).map(([route, value]) => {
        const sorted = value.durationSamples.slice().sort((a, b) => a - b);
        const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
        const p95Sample = sorted.length ? sorted[p95Index] ?? 0 : 0;
        return {
          route, count: value.count, blocked: value.blocked,
          averageDurationMs: value.count ? Number((value.totalDurationMs / value.count).toFixed(2)) : 0,
          maxDurationMs: Number(value.maxDurationMs.toFixed(2)),
          p95DurationMs: Number(p95Sample.toFixed(2)),
        };
      }).sort((a, b) => b.p95DurationMs - a.p95DurationMs).slice(0, 20),
    },
    sockets: { connected: getIO().engine.clientsCount },
    database: { ...database },
  };
}

const HISTORY_KEY = "sm-erp:monitoring:history:v1";
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;
const HISTORY_TTL_SECONDS = 26 * 60 * 60;
const HISTORY_MAX_RESPONSE_POINTS = 720;
let lastHistoryWarningAt = 0;

type HistoryPoint = {
  timestamp: string;
  server: { processCpuPercent: number; processMemoryBytes: number; heapUsedBytes: number; heapTotalBytes: number; processUptimeSeconds: number; eventLoopP95Ms: number };
  database: { latencyMs: number | null; activeSessions: number | null; idleSessions: number | null; totalSessions: number | null; waitingSessions: number | null; longestActiveQuerySeconds: number | null };
  requests: { active: number; totalAllowed: number; totalBlocked: number; requestsPerSecond: number };
  sockets: { connected: number };
};

function toHistoryPoint(snapshot: ReturnType<typeof createSnapshot>): HistoryPoint {
  return {
    timestamp: snapshot.timestamp,
    server: {
      processCpuPercent: snapshot.server.processCpuPercent,
      processMemoryBytes: snapshot.server.processMemoryBytes,
      heapUsedBytes: snapshot.server.heapUsedBytes,
      heapTotalBytes: snapshot.server.heapTotalBytes,
      processUptimeSeconds: snapshot.server.processUptimeSeconds,
      eventLoopP95Ms: snapshot.server.eventLoopDelayMs.p95,
    },
    database: {
      latencyMs: snapshot.database.latencyMs,
      activeSessions: snapshot.database.activeSessions,
      idleSessions: snapshot.database.idleSessions,
      totalSessions: snapshot.database.totalSessions,
      waitingSessions: snapshot.database.waitingSessions,
      longestActiveQuerySeconds: snapshot.database.longestActiveQuerySeconds,
    },
    requests: {
      active: snapshot.requests.active,
      totalAllowed: snapshot.requests.totalAllowed,
      totalBlocked: snapshot.requests.totalBlocked,
      requestsPerSecond: snapshot.requests.requestsPerSecond,
    },
    sockets: { connected: snapshot.sockets.connected },
  };
}

async function persistHistory(snapshot: ReturnType<typeof createSnapshot>): Promise<void> {
  if (redis.status !== "ready") return;
  try {
    const timestamp = Date.parse(snapshot.timestamp);
    const point = toHistoryPoint(snapshot);
    await redis.zadd(HISTORY_KEY, timestamp, JSON.stringify(point));
    await redis.zremrangebyscore(HISTORY_KEY, "-inf", timestamp - HISTORY_RETENTION_MS);
    await redis.expire(HISTORY_KEY, HISTORY_TTL_SECONDS);
  } catch (error) {
    const now = Date.now();
    if (now - lastHistoryWarningAt > 60_000) {
      lastHistoryWarningAt = now;
      console.warn("[SystemMonitor] Redis history write failed:", error instanceof Error ? error.message : error);
    }
  }
}

export async function getMonitoringHistory(hours = 24) {
  const safeHours = [1, 6, 12, 24].includes(hours) ? hours : 24;
  if (redis.status !== "ready") {
    return { success: false, available: false, hours: safeHours, points: [], sampleCount: 0, message: "Redis history storage is unavailable" };
  }
  try {
    const rows = await redis.zrangebyscore(HISTORY_KEY, Date.now() - safeHours * 60 * 60 * 1000, "+inf");
    const parsed: HistoryPoint[] = [];
    for (const row of rows) {
      try {
        const point = JSON.parse(row) as HistoryPoint;
        if (point?.timestamp && Number.isFinite(Date.parse(point.timestamp))) parsed.push(point);
      } catch { /* Ignore malformed samples without losing valid history. */ }
    }
    parsed.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const stride = Math.max(1, Math.ceil(parsed.length / HISTORY_MAX_RESPONSE_POINTS));
    const points = parsed.filter((_, index) => index % stride === 0);
    const lastPoint = parsed.at(-1);
    if (lastPoint && points.at(-1) !== lastPoint) points.push(lastPoint);
    return { success: true, available: true, hours: safeHours, points, sampleCount: parsed.length, returnedCount: points.length, retentionHours: 24 };
  } catch (error) {
    const now = Date.now();
    if (now - lastHistoryWarningAt > 60_000) {
      lastHistoryWarningAt = now;
      console.warn("[SystemMonitor] Redis history read failed:", error instanceof Error ? error.message : error);
    }
    return { success: false, available: false, hours: safeHours, points: [], sampleCount: 0, message: "Unable to read Redis monitoring history" };
  }
}

async function publishSample(): Promise<void> {
  await sampleDatabase();
  const snapshot = createSnapshot();
  void persistHistory(snapshot);
  getIO().to(ROOM).emit("system:metrics", snapshot);
}

export function startSystemMonitor(): void {
  if (timer) return;
  eventLoop.reset();
  getIO().on("connection", socket => {
    // Metrics are published only to this room. Explicitly authorize and join
    // admin clients; emitting "monitoring:subscribe" without a handler used
    // to leave every dashboard socket outside the room.
    socket.on("monitoring:subscribe", async (
      payload: { token?: string } = {},
      callback?: (result: { success: boolean; message?: string }) => void,
    ) => {
      try {
        if (typeof payload?.token !== "string" || !payload.token) {
          callback?.({ success: false, message: "Authentication required" });
          return;
        }

        const tokenPayload = verifyAccessToken(payload.token);
        const userId = Number(tokenPayload.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
          callback?.({ success: false, message: "Invalid authentication token" });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { isActive: true, userRole: true },
        });
        const role = String(user?.userRole || "").trim().toUpperCase();
        if (!user?.isActive || (role !== "ADMIN" && role !== "SUPER ADMIN")) {
          callback?.({ success: false, message: "Administrator access required" });
          return;
        }

        await socket.join(ROOM);
        callback?.({ success: true });
        socket.emit("system:metrics", createSnapshot());
      } catch (error) {
        callback?.({ success: false, message: "Unable to authorize monitoring subscription" });
        console.warn("[SystemMonitor] Metrics subscription rejected:", error instanceof Error ? error.message : error);
      }
    });

    socket.on("monitoring:unsubscribe", () => {
      void socket.leave(ROOM);
    });

    socket.on("monitoring:history:request", async (payload: { hours?: number } = {}, callback?: (result: Awaited<ReturnType<typeof getMonitoringHistory>>) => void) => {
      const result = await getMonitoringHistory(Number(payload?.hours ?? 24));
      callback?.(result);
    });
  });
  void publishSample().catch(error => console.error("[SystemMonitor] Initial sample failed:", error));
  timer = setInterval(() => void publishSample().catch(error => console.error("[SystemMonitor] Sample failed:", error)), SAMPLE_MS);
  timer.unref();
  console.log(`[SystemMonitor] Live metrics sampling every ${SAMPLE_MS}ms`);
}
export function stopSystemMonitor(): void {
  if (timer) clearInterval(timer);
  timer = null;
  eventLoop.disable();
}
