import { randomUUID } from "crypto";
import redis from "../../redis/connect.redis";

const TTL_MS = 30 * 60 * 1000;      // a message is deleted 30 min after it is delivered
const EXPIRY_KEY = "chat:expiry";   // schedule of deletions: member "<userId>:<messageId>", score = delete time
const CLEANUP_BATCH = 500;

export interface ChatMessage {
    id: string;
    from: string;
    to: string;
    text: string;
    createdAt: number;
    deliveredAt: number | null; // null = still waiting in the queue
    queued?: boolean;           // sent to client: true if it came from the queue
    delivered?: boolean;        // sent to client: derived from deliveredAt
}

// The queue: one hash per receiver. Field = message id, value = message JSON.
// Messages stay here after delivery until their 30 minutes are over.
const inboxKey = (userId: string) => `chat:inbox:${userId}`;

const safeParse = (raw: string): ChatMessage | null => {
    try {
        return JSON.parse(raw) as ChatMessage;
    } catch {
        return null;
    }
};

const toStored = (msg: ChatMessage): string =>
    JSON.stringify({
        id: msg.id,
        from: msg.from,
        to: msg.to,
        text: msg.text,
        createdAt: msg.createdAt,
        deliveredAt: msg.deliveredAt,
    });

const withFlag = (msg: ChatMessage): ChatMessage => ({ ...msg, delivered: msg.deliveredAt !== null });

const isParsed = (m: ChatMessage | null): m is ChatMessage => m !== null;

export const createMessage = (from: string, to: string, text: string): ChatMessage => ({
    id: randomUUID(),
    from,
    to,
    text,
    createdAt: Date.now(),
    deliveredAt: null,
});

/* ---------------- Queue ---------------- */

// Saves a message in the receiver's queue. It has no expiry until it is delivered.
export const storeMessage = async (msg: ChatMessage): Promise<void> => {
    await redis.hset(inboxKey(msg.to), msg.id, toStored(msg));
};

// Messages still waiting for delivery, oldest first
export const getPending = async (userId: string): Promise<ChatMessage[]> => {
    const all = await redis.hgetall(inboxKey(userId));
    return Object.values(all)
        .map(safeParse)
        .filter(isParsed)
        .filter((m) => m.deliveredAt === null)
        .sort((a, b) => a.createdAt - b.createdAt);
};

export const pendingCount = async (userId: string): Promise<number> => {
    return (await getPending(userId)).length;
};

// Marks the message as delivered. It stays in the queue and is scheduled for deletion in 30 minutes.
export const markDelivered = async (msg: ChatMessage): Promise<ChatMessage> => {
    const deliveredAt = Date.now();
    const updated: ChatMessage = { ...msg, deliveredAt };

    await redis
        .multi()
        .hset(inboxKey(msg.to), msg.id, toStored(updated))
        .zadd(EXPIRY_KEY, deliveredAt + TTL_MS, `${msg.to}:${msg.id}`)
        .exec();

    return updated;
};

/* ---------------- Cleanup (30 min after delivery) ---------------- */

export const cleanupExpired = async (): Promise<number> => {
    const due = await redis.zrangebyscore(EXPIRY_KEY, 0, Date.now(), "LIMIT", 0, CLEANUP_BATCH);
    if (due.length === 0) return 0;

    const multi = redis.multi();
    for (const member of due) {
        const i = member.lastIndexOf(":");
        multi.hdel(inboxKey(member.slice(0, i)), member.slice(i + 1));
    }
    multi.zrem(EXPIRY_KEY, ...due);
    await multi.exec();

    return due.length;
};

/* ---------------- History for opening a chat ---------------- */

// Messages between two users:
// - delivered ones during their 30 minutes
// - the caller's own messages that are still waiting (delivered: false)
export const getHistory = async (me: string, other: string): Promise<ChatMessage[]> => {
    const now = Date.now();
    const [myInbox, otherInbox] = await Promise.all([
        redis.hgetall(inboxKey(me)),
        redis.hgetall(inboxKey(other)),
    ]);

    // Messages I received from "other": only after they were delivered to me
    const received = Object.values(myInbox)
        .map(safeParse)
        .filter(isParsed)
        .filter((m) => m.from === other && m.deliveredAt !== null && m.deliveredAt > now - TTL_MS);

    // Messages I sent to "other": delivered ones during their 30 minutes, plus ones still waiting
    const sent = Object.values(otherInbox)
        .map(safeParse)
        .filter(isParsed)
        .filter((m) => m.from === me && (m.deliveredAt === null || m.deliveredAt > now - TTL_MS));

    return [...received, ...sent].map(withFlag).sort((a, b) => a.createdAt - b.createdAt);
};