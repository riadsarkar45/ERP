import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
});

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("ready", () => {
    console.log("Redis ready");
});

redis.on("error", (err) => {
    console.error("Redis error:", err);
});

redis.on("close", () => {
    console.log("Redis connection closed");
});

export const disconnectRedis = async () => {
    if (redis.status !== "end") {
        await redis.quit();
    }
};

export default redis;