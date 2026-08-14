import type { Request, Response, NextFunction } from "express";
import { getIO } from "../../middleware/socket.io/socket";

export const responseTimeMonitor = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    // res.on('finish') fires after the response has actually been sent to the client
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

        const payload = {
            route: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
            timestamp: new Date().toISOString(),
        };

        // Log to console (or swap for a real logger like winston/pino)
        console.log(
            `[${payload.method}] ${payload.route} → ${payload.statusCode} (${payload.durationMs}ms)`
        );

        // Broadcast to any connected monitoring dashboards
        try {
            const io = getIO();
            if (io) io.emit("api-response-time", payload);
        } catch (err) {
            console.error("Failed to emit api-response-time:", err);
        }
    });

    next();
};