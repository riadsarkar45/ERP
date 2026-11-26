import os from "node:os";
import { performance } from "node:perf_hooks";
import prisma from "../database/prismaClient/prisma";
import { getIO } from "../middleware/socket.io/socket";
import { metrics } from "../middleware/rateLimiter/metrics";

const MONITORING_ROOM = "monitoring:admins";
const SAMPLE_INTERVAL_MS = 5000;

let interval: NodeJS.Timeout | null = null;
let previousCpu = process.cpuUsage();
let previousCpuSampleAt = performance.now();

const database = {
  status: "unavailable" as "connected" | "unavailable",
  latencyMs: null as number | null,
  activeSessions: null as number | null,
  idleSessions: null as number | null,
  totalSessions: null as number | null,
  sampledAt: null as string | null,
};

async function sampleDatabase(): Promise<void> {
  const startedAt = performance.now();
  try {
    const rows = await prisma.$queryRaw<Array<{ active: number; idle: number; total: number }>>`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active')::int AS active,
        COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
        COUNT(*)::int AS total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    const row = rows[0];
    database.status = "connected";
    database.latencyMs = Number((performance.now() - startedAt).toFixed(2));
    database.activeSessions = row?.active ?? 0;
    database.idleSessions = row?.idle ?? 0;
    database.totalSessions = row?.total ?? 0;
  } catch (error) {
    database.status = "unavailable";
    database.latencyMs = Number((performance.now() - startedAt).toFixed(2));
    database.activeSessions = null;
    database.idleSessions = null;
    database.totalSessions = null;
    console.warn("[SystemMonitor] DB sample failed:", error instanceof Error ? error.message : error);
  }
  database.sampledAt = new Date().toISOString();
}

function createSnapshot() {
  const now = performance.now();
  const elapsedMicros = Math.max((now - previousCpuSampleAt) * 1000, 1);
  const cpuDelta = process.cpuUsage(previousCpu);
  const cpuCores = Math.max(os.cpus().length, 1);
  const processCpuPercent = Math.min(100, Math.max(0,
    ((cpuDelta.user + cpuDelta.system) / elapsedMicros / cpuCores) * 100
  ));
  previousCpu = process.cpuUsage();
  previousCpuSampleAt = now;

  const memory = process.memoryUsage();
  const io = getIO();

  return {
    timestamp: new Date().toISOString(),
    server: {
      status: "online" as const,
      processCpuPercent: Number(processCpuPercent.toFixed(1)),
      processMemoryBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      cpuCores,
    },
    requests: {
      active: metrics.activeRequests,
      totalAllowed: metrics.allowed,
      totalBlocked: metrics.blocked,
    },
    sockets: { connected: io.engine.clientsCount },
    database: { ...database },
  };
}

async function publishSample(): Promise<void> {
  await sampleDatabase();
  getIO().to(MONITORING_ROOM).emit("system:metrics", createSnapshot());
}

export function startSystemMonitor(): void {
  if (interval) return;
  void publishSample().catch(error => console.error("[SystemMonitor] Initial sample failed:", error));
  interval = setInterval(() => {
    void publishSample().catch(error => console.error("[SystemMonitor] Sample failed:", error));
  }, SAMPLE_INTERVAL_MS);
  interval.unref();
  console.log(`[SystemMonitor] Live metrics sampling every ${SAMPLE_INTERVAL_MS}ms`);
}

export function stopSystemMonitor(): void {
  if (interval) clearInterval(interval);
  interval = null;
}
