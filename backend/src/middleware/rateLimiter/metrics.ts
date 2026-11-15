
export interface RouteMetrics {
  allowed: number;
  blocked: number;
}

export const metrics = {
  allowed: 0,
  blocked: 0,
  byRoute: new Map<string, RouteMetrics>(),
};
