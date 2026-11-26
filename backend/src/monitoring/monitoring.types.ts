export interface SystemMonitorSnapshot {
  timestamp: string;
  server: {
    status: "online";
    hostname: string;
    platform: string;
    nodeVersion: string;
    uptimeSeconds: number;
    processCpuPercent: number;
    processMemoryMb: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    activeHttpRequests: number;
    socketConnections: number;
  };
  database: {
    status: "connected" | "error";
    latencyMs: number | null;
    activeSessions: number | null;
    idleSessions: number | null;
    runningQueries: number | null;
    longestQuerySeconds: number | null;
    error?: string;
  };
}
