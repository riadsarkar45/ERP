import os from "os";
import prisma from "../database/prismaClient/prisma";
import { getIO } from "../middleware/socket.io/socket";
import { metrics } from "../middleware/rateLimiter/metrics";

const MONITOR_ROOM = "system-monitor:subscribers";
const INTERVAL_MS = 3000;

let timer: NodeJS.Timeout | null = null;
let previousCpu = process.cpuUsage();
let previousCpuAt = process.hrtime.bigint();

const round = (value: number, digits = 1): number =>
  Number(value.toFixed(digits));

const getProcessCpuPercent = (): number => {
  const currentCpu = process.cpuUsage();
  const currentAt = process.hrtime.bigint();
  const elapsedMicros = Number(currentAt - previousCpuAt) / 1_000;
  const usedMicros =
    currentCpu.user - previousCpu.user +
    currentCpu.system - previousCpu.system;

  previousCpu = currentCpu;
  previousCpuAt = currentAt;

  if (elapsedMicros <= 0) return 0;
  return round((usedMicros / elapsedMicros) * 100);
};

const collectSnapshot = async () => {
  const memory = process.memoryUsage();
  const cpuPercent = getProcessCpuPercent();
  const socketCount = getIO().engine.clientsCount;

  let database: {
    status: "connected" | "error";
    latencyMs: number | null;
    activeSessions: number | null;
    idleSessions: number | null;
    runningQueries: number | null;
    longestQuerySeconds: number | null;
    error?: string;
  };

  const dbStartedAt = Date.now();
  try {
    const rows = await prisma.$queryRaw<Array<{
      active_sessions: bigint;
      idle_sessions: bigint;
      running_queries: bigint;
      longest_query_seconds: number | null;
    }>>`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active')::bigint AS active_sessions,
        COUNT(*) FILTER (WHERE state = 'idle')::bigint AS idle_sessions,
        COUNT(*) FILTER (
          WHERE state = 'active' AND query NOT ILIKE '%pg_stat_activity%'
        )::bigint AS running_queries,
        MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) FILTER (
          WHERE state = 'active' AND query_start IS NOT NULL
            AND query NOT ILIKE '%pg_stat_activity%'
        )::float AS longest_query_seconds
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    database = {
      status: "connected",
      latencyMs: Date.now() - dbStartedAt,
      activeSessions: Number(rows[0]?.active_sessions ?? 0n),
      idleSessions: Number(rows[0]?.idle_sessions ?? 0n),
      runningQueries: Number(rows[0]?.running_queries ?? 0n),
      longestQuerySeconds:
        rows[0]?.longest_query_seconds == null
          ? null
          : round(rows[0].longest_query_seconds, 2),
    };
  } catch (error) {
    database = {
      status: "error",
      latencyMs: Date.now() - dbStartedAt,
      activeSessions: null,
      idleSessions: null,
      runningQueries: null,
      longestQuerySeconds: null,
      error: error instanceof Error ? error.message : "Database metrics unavailable",
    };
  }

  return {
    timestamp: new Date().toISOString(),
    server: {
      status: "online" as const,
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      processCpuPercent: cpuPercent,
      processMemoryMb: {
        rss: round(memory.rss / 1024 / 1024),
        heapUsed: round(memory.heapUsed / 1024 / 1024),
        heapTotal: round(memory.heapTotal / 1024 / 1024),
      },
      activeHttpRequests: metrics.active,
      socketConnections: socketCount,
    },
    database,
    notes: {
      cpu: "Node.js process CPU, not Render host/container CPU.",
      memory: "Node.js process memory, not total Render host/container memory.",
      database: "pg_stat_activity visibility depends on the Neon database role permissions.",
    },
  };
};

const publishSnapshot = async () => {
  try {
    const snapshot = await collectSnapshot();
    getIO().to(MONITOR_ROOM).emit("system-monitor:update", snapshot);
  } catch (error) {
    console.error("[SystemMonitor] Snapshot failed:", error);
  }
};

export const subscribeToSystemMonitor = (socketId: string): void => {
  const io = getIO();
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;

  void socket.join(MONITOR_ROOM);

  if (!timer) {
    void publishSnapshot();
    timer = setInterval(() => {
      void publishSnapshot();
    }, INTERVAL_MS);
    timer.unref();
  }
};

export const unsubscribeFromSystemMonitor = (socketId: string): void => {
  const io = getIO();
  const socket = io.sockets.sockets.get(socketId);
  if (socket) void socket.leave(MONITOR_ROOM);

  if (io.sockets.adapter.rooms.get(MONITOR_ROOM)?.size === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
};
