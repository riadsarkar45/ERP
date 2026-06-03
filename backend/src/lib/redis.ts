import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  RESP: 2 as any,
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
redisClient.on("connect", () => console.log("Redis connected"));

export const connectRedis = async () => {
  await redisClient.connect();
};