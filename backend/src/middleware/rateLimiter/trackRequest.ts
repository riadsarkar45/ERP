import { getIO } from "../socket.io/socket";
import { metrics } from "./metrics";

export const trackRequests = (req: any, res: any, next: any) => {
  const route = req.originalUrl;

  res.on("finish", () => {
    const io = getIO();
    if(!io) return; 
    if (!metrics.byRoute.has(route)) {
      metrics.byRoute.set(route, { allowed: 0, blocked: 0 });
    }

    const data = metrics.byRoute.get(route)!;

    if (res.statusCode === 429) {
      metrics.blocked++;
      data.blocked++;

      console.log("BLOCKED:", route);

      io.emit("rate-limit-event", {
        type: "blocked",
        route,
        ip: req.ip,
        totalBlocked: metrics.blocked,
      });
    } else {
      metrics.allowed++;
      data.allowed++;

      io.emit("rate-limit-event", {
        type: "allowed",
        route,
        ip: req.ip,
        totalAllowed: metrics.allowed,
      });
    }
  });

  next();
};