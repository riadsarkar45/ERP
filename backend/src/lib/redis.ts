
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy(retries) {
      if (retries > 10) {
        console.error("Redis: Maximum reconnection attempts reached");
        return new Error("Redis reconnection limit reached");
      }

      return Math.min(retries * 1000, 10000);
    },
    connectTimeout: 10000,
  },
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis ready!");
});

redisClient.on("reconnecting", () => {
  console.warn("Redis reconnecting...");
});

redisClient.on("end", () => {
  console.warn("Redis connection closed");
});

export const connectRedis = async () => {
  if (redisClient.isOpen) return;

  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (error) {
    console.error("Redis initial connection failed:", error);
    throw error;
  }
};
