
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import {
  connectDatabase,
  disconnectDatabase,
} from "./database/connect";

import router from "./routes/post";
import getRouters from "./routes/get";
import updateRouters from "./routes/update";
import authRouter from "./routes/auth/auth.Routes";
import getMobileRouters from "./routes/mobileRoutes/get";

import { initSocket } from "./middleware/socket.io/socket";
import { trackRequests } from "./middleware/rateLimiter/trackRequest";
import { initSocketRoutes } from "./socketRoutes/socket.routes";

import {
  connectRedis,
  disconnectRedis,
} from "./redis/connect.redis";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const corsOrigins = [
  "https://erp-three-pied.vercel.app",
  "https://erp-backend-ruby.vercel.app",
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:1420",
  "http://localhost:1420",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
];

// Proxy configuration
app.set("trust proxy", 1);

// Middlewares
app.use(cookieParser());

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "SM ERP Backend Running",
    timestamp: new Date().toISOString(),
  });
});

// Redis and database health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    server: "online",
    timestamp: new Date().toISOString(),
  });
});

// Request tracking
app.use(trackRequests);

// API routes
app.use("/api", router);
app.use("/api", getRouters);
app.use("/api", updateRouters);
app.use("/api", authRouter);
app.use("/api/mobile", getMobileRouters);

// Server state
let isShuttingDown = false;

const start = async (): Promise<void> => {
  try {
    // 1. Database connection
    console.log("Connecting to database...");

    await connectDatabase();

    console.log("Database connected successfully");

    // 2. Redis connection
    try {
      console.log("Connecting to Redis...");

      await connectRedis();

      console.log("Redis connected successfully");
    } catch (error) {
      console.error(
        "Redis unavailable:",
        error instanceof Error ? error.message : error
      );

      console.warn(
        "Backend will continue without Redis. Redis-dependent operations must handle failures safely."
      );
    }

    // 3. Start Express server
    const server = app.listen(PORT, () => {
      console.log("--------------------------------");
      console.log("SM ERP BACKEND STARTED");
      console.log(`Port: ${PORT}`);
      console.log("Database: Connected");
      console.log("--------------------------------");
    });

    // 4. Initialize Socket.IO
    initSocket(server);

    // 5. Initialize Socket routes
    initSocketRoutes();

    // 6. Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) return;

      isShuttingDown = true;

      console.log(`${signal} received. Starting graceful shutdown...`);

      const forceShutdown = setTimeout(() => {
        console.error("Graceful shutdown timed out. Forcing exit.");
        process.exit(1);
      }, 15000);

      forceShutdown.unref();

      try {
        // Stop accepting new HTTP connections
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        console.log("HTTP server closed");

        // Disconnect Redis
        await disconnectRedis();

        // Disconnect database
        await disconnectDatabase();

        console.log("All connections closed successfully");

        clearTimeout(forceShutdown);

        process.exit(0);
      } catch (error) {
        console.error("Shutdown error:", error);

        clearTimeout(forceShutdown);

        process.exit(1);
      }
    };

    process.once("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
      void shutdown("SIGTERM");
    });

  } catch (error) {
    console.error("Backend startup failed:", error);

    try {
      await disconnectRedis();
      await disconnectDatabase();
    } catch (shutdownError) {
      console.error("Startup cleanup failed:", shutdownError);
    }

    process.exit(1);
  }
};

void start();
