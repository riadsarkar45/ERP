export interface RouteMetrics {
  allowed: number;
  blocked: number;
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
  durationSamples: number[];
}

export const metrics = {
  allowed: 0,
  blocked: 0,
  activeRequests: 0,
  byRoute: new Map<string, RouteMetrics>(),
};
