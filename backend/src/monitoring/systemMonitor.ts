import os from "node:os";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import v8 from "node:v8";
import prisma from "../database/prismaClient/prisma";
import redis from "../redis/connect.redis";
import { getIO } from "../middleware/socket.io/socket";
import { metrics } from "../middleware/rateLimiter/metrics";

const ROOM = "monitoring:admins";
const SAMPLE_MS = 5000;
const REDIS_SAMPLE_MS = 15000;
const processStartedAt = new Date();
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();
let timer: NodeJS.Timeout | null = null;
let previousCpu = process.cpuUsage();
let previousCpuAt = performance.now();
let lastRedisAt = 0;

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

let redisMetrics: Record<string, unknown> = {
  status: "unavailable", latencyMs: null, uptimeSeconds: null,
  connectedClients: null, usedMemoryBytes: null, usedMemoryPeakBytes: null,
  totalConnectionsReceived: null, totalCommandsProcessed: null,
  instantaneousOpsPerSecond: null, keyspace: {}, sampledAt: null,
};

function parseInfo(info: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of info.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf(":");
    if (index > 0) result[line.slice(0, index)] = line.slice(index + 1);
  }
  return result;
}
function toNumber(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function sampleRedis(): Promise<void> {
  const now = Date.now();
  if (now - lastRedisAt < REDIS_SAMPLE_MS) return;
  lastRedisAt = now;
  const started = performance.now();

  if (redis.status !== "ready") {
    redisMetrics = { ...redisMetrics, status: ["connecting", "reconnecting"].includes(redis.status) ? "connecting" : "unavailable", clientState: redis.status, latencyMs: null, sampledAt: new Date().toISOString() };
    return;
  }
  try {
    const [ping, serverRaw, memoryRaw, clientsRaw, statsRaw, keyspaceRaw] = await Promise.all([
      redis.ping(), redis.info("server"), redis.info("memory"), redis.info("clients"), redis.info("stats"), redis.info("keyspace"),
    ]);
    if (ping !== "PONG") throw new Error("Unexpected Redis PING response");
    const server = parseInfo(serverRaw), memory = parseInfo(memoryRaw), clients = parseInfo(clientsRaw), stats = parseInfo(statsRaw);
    const keyspaceInfo = parseInfo(keyspaceRaw);
    const keyspace: Record<string, unknown> = {};
    for (const [db, raw] of Object.entries(keyspaceInfo)) {
      const fields = parseInfo(raw.replaceAll(",", "\n"));
      keyspace[db] = { keys: toNumber(fields.keys), expires: toNumber(fields.expires), avgTtlMs: toNumber(fields.avg_ttl) };
    }
    redisMetrics = {
      status: "connected", clientState: redis.status,
      latencyMs: Number((performance.now() - started).toFixed(2)),
      uptimeSeconds: toNumber(server.uptime_in_seconds),
      connectedClients: toNumber(clients.connected_clients),
      usedMemoryBytes: toNumber(memory.used_memory),
      usedMemoryPeakBytes: toNumber(memory.used_memory_peak),
      totalConnectionsReceived: toNumber(stats.total_connections_received),
      totalCommandsProcessed: toNumber(stats.total_commands_processed),
      instantaneousOpsPerSecond: toNumber(stats.instantaneous_ops_per_sec),
      keyspace, sampledAt: new Date().toISOString(),
    };
  } catch (error) {
    redisMetrics = { ...redisMetrics, status: "error", latencyMs: Number((performance.now() - started).toFixed(2)), sampledAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Redis telemetry failed" };
    console.warn("[SystemMonitor] Redis sample failed:", error instanceof Error ? error.message : error);
  }
}

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
  const elapsedMicros = Math.max((now - previousCpuAt) * 1000, 1);
  const delta = process.cpuUsage(previousCpu);
  const cpuCores = Math.max(os.cpus().length, 1);
  const cpuPercent = Math.min(100, Math.max(0, ((delta.user + delta.system) / elapsedMicros / cpuCores) * 100));
  previousCpu = process.cpuUsage();
  previousCpuAt = now;
  const memory = process.memoryUsage();
  const heap = v8.getHeapStatistics();
  const load = os.loadavg();

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
      eventLoopDelayMs: {
        mean: Number((eventLoop.mean / 1e6 || 0).toFixed(2)),
        p95: Number((eventLoop.percentile(95) / 1e6 || 0).toFixed(2)),
        max: Number((eventLoop.max / 1e6 || 0).toFixed(2)),
      },
    },
    requests: {
      active: metrics.activeRequests, totalAllowed: metrics.allowed, totalBlocked: metrics.blocked,
      routes: Array.from(metrics.byRoute.entries()).map(([route, value]) => {
        const sorted = value.durationSamples.slice().sort((a, b) => a - b);
        return {
          route, count: value.count, blocked: value.blocked,
          averageDurationMs: value.count ? Number((value.totalDurationMs / value.count).toFixed(2)) : 0,
          maxDurationMs: Number(value.maxDurationMs.toFixed(2)),
          p95DurationMs: sorted.length ? Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)].toFixed(2)) : 0,
        };
      }).sort((a, b) => b.p95DurationMs - a.p95DurationMs).slice(0, 20),
    },
    sockets: { connected: getIO().engine.clientsCount },
    database: { ...database },
    redis: { ...redisMetrics },
  };
}

async function publishSample(): Promise<void> {
  await Promise.all([sampleDatabase(), sampleRedis()]);
  getIO().to(ROOM).emit("system:metrics", createSnapshot());
}

export function startSystemMonitor(): void {
  if (timer) return;
  eventLoop.reset();
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
