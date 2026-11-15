
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { ipBlockAlert } from "../socket.io/ipBlockAlert";
import { getIO } from "../socket.io/socket";
import { metrics } from "./metrics";

const MAX_TRACKED_ROUTES = 1000;

interface AuthenticatedRequest extends Request {
  user?: Request["user"] & {
    id?: string | number;
  };
}

export const trackRequests = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const route = req.route?.path
    ? `${req.baseUrl}${req.route.path}`
    : req.path;

  res.once("finish", () => {
    try {
      const isBlocked = res.statusCode === 429;

      // Keep global metrics updated even without Socket.IO
      if (isBlocked) {
        metrics.blocked++;
      } else {
        metrics.allowed++;
      }

      if (
        !metrics.byRoute.has(route) &&
        metrics.byRoute.size < MAX_TRACKED_ROUTES
      ) {
        metrics.byRoute.set(route, {
          allowed: 0,
          blocked: 0,
        });
      }

      const routeData = metrics.byRoute.get(route);

      if (routeData) {
        if (isBlocked) {
          routeData.blocked++;
        } else {
          routeData.allowed++;
        }
      }

      const io = getIO();

      if (!io) return;

      // Emit monitoring event
      io.emit("rate-limit-event", {
        type: isBlocked ? "blocked" : "allowed",
        route,
        ip: req.ip || "unknown",
        totalBlocked: isBlocked ? metrics.blocked : undefined,
        totalAllowed: !isBlocked ? metrics.allowed : undefined,
      });

      // Send alert only for blocked requests
      if (isBlocked) {
        void Promise.resolve(
          ipBlockAlert({
            route,
            ip: req.ip || "unknown",
            totalBlocked: metrics.blocked,
            userId: req.user?.id ?? null,
          })
        ).catch((error) => {
          console.error("IP block alert failed:", error);
        });
      }
    } catch (error) {
      console.error("Request tracking error:", error);
    }
  });

  next();
};
