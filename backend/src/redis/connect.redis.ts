
import Redis from "ioredis";

const redisUrl =
  process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 10000,

  retryStrategy(times) {
    if (times >= 10) {
      console.error("Redis: Maximum reconnection attempts reached");
      return null;
    }

    return Math.min(times * 1000, 10000);
  },
});

redis.on("connect", () => {
  console.log("Redis connecting...");
});

redis.on("ready", () => {
  console.log("Redis ready and operational");
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("close", () => {
  console.warn("Redis connection closed");
});

redis.on("reconnecting", (delay: any) => {
  console.log(`Redis reconnecting in ${delay}ms`);
});

export const connectRedis = async () => {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    await redis.ping();

    console.log("Redis health check successful");

  } catch (error) {
    console.error("Redis connection failed:", error);
    throw error;
  }
};

export const disconnectRedis = async () => {
  try {
    if (redis.status === "end") return;

    if (redis.status === "ready") {
      await redis.quit();
    } else {
      redis.disconnect();
    }

    console.log("Redis disconnected successfully");

  } catch (error) {
    console.error("Redis disconnect error:", error);
    redis.disconnect();
  }
};

export default redis;
