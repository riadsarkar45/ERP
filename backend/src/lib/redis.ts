import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  RESP: 2 as any,
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("ready", () => console.log("✅ Redis ready"));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect Redis:", error);
    console.warn("⚠️ Redis connection failed. Rate limiting will use in-memory store.");
  }
};

export const isRedisConnected = () => redisClient.isOpen;