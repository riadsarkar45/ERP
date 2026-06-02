// metrics.ts
export const metrics = {
  allowed: 0,
  blocked: 0,
  byRoute: new Map<string, { allowed: number; blocked: number }>(),
};