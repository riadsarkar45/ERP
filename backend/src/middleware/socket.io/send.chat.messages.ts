import { Socket } from "socket.io";
import { getIO } from "./socket";
import {
    createMessage,
    storeMessage,
    getPending,
    pendingCount,
    markDelivered,
    cleanupExpired,
    getHistory,
} from "./chat.messages";
import type { ChatMessage } from "./chat.messages";

interface CustomSocketData {
    userId?: string;
}

const MAX_TEXT_LENGTH = 2000;
const DELIVERY_DELAY_MS = 15 * 1000; // wait 15 seconds after the user comes online
const ACK_TIMEOUT_MS = 5 * 1000;     // how long to wait for the browser to confirm
const CLEANUP_INTERVAL_MS = 30 * 1000;
const REDIS_TIMEOUT_MS = 3 * 1000;   // a stuck Redis must not freeze the chat

// One pending delivery timer per user
const deliveryTimers = new Map<string, NodeJS.Timeout>();

/* ---------------- Helpers ---------------- */

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });

export const isUserOnline = async (userId: string): Promise<boolean> => {
    const sockets = await getIO().in(`user:${userId}`).fetchSockets();
    return sockets.length > 0;
};

// Sends one message to the receiver and resolves true only if at least one of
// their tabs/devices confirmed it (the client calls the ack function).
const deliverMessage = (msg: ChatMessage, queued: boolean): Promise<boolean> => {
    return new Promise((resolve) => {
        getIO()
            .to(`user:${msg.to}`)
            .timeout(ACK_TIMEOUT_MS)
            .emit(
                "receive-message",
                { ...msg, queued, delivered: false },
                (_err: Error | null, responses: any[]) => {
                    resolve(Array.isArray(responses) && responses.length > 0);
                }
            );
    });
};

const notifySenderDelivered = (msg: ChatMessage) => {
    getIO().to(`user:${msg.from}`).emit("message-delivered", { id: msg.id, to: msg.to });
};

/* ---------------- Cleanup job: deletes messages 30 min after delivery ---------------- */

let cleanupStarted = false;

const startCleanupJob = () => {
    if (cleanupStarted) return;
    cleanupStarted = true;

    const run = async () => {
        try {
            const removed = await withTimeout(cleanupExpired(), REDIS_TIMEOUT_MS, "cleanup");
            if (removed > 0) console.log(`🧹 Deleted ${removed} chat message(s) 30 minutes after delivery`);
        } catch (err: any) {
            console.error("[chat] cleanup error:", err.message);
        }
    };

    run(); // also clears anything that expired while the server was down
    const timer = setInterval(run, CLEANUP_INTERVAL_MS);
    timer.unref?.();
};

/* ---------------- Queued delivery ---------------- */

// Call when a user comes online. After 15 seconds their queued messages are delivered.
export const scheduleQueuedDelivery = (userId: string): void => {
    if (deliveryTimers.has(userId)) return; // already waiting

    const timer = setTimeout(async () => {
        deliveryTimers.delete(userId);

        try {
            if (!(await isUserOnline(userId))) return; // went offline again, messages stay queued

            const pending = await withTimeout(getPending(userId), REDIS_TIMEOUT_MS, "getPending");
            let deliveredCount = 0;

            for (const msg of pending) {
                const delivered = await deliverMessage(msg, true);
                if (!delivered) break; // not confirmed: keep the rest queued, preserve order

                // Delivered. The message STAYS in the queue; it will be deleted 30 minutes from now.
                const updated = await withTimeout(markDelivered(msg), REDIS_TIMEOUT_MS, "markDelivered");
                notifySenderDelivered(updated);
                deliveredCount++;
            }

            if (deliveredCount > 0) {
                console.log(`📨 Delivered ${deliveredCount} queued message(s) to user ${userId}`);
            }
        } catch (err: any) {
            console.error("[chat] queued delivery error:", err.message);
        }
    }, DELIVERY_DELAY_MS);

    deliveryTimers.set(userId, timer);
};

// Call when a socket disconnects. Cancels the wait only if the user has no other tab/device open.
export const cancelQueuedDeliveryIfOffline = async (userId: string): Promise<void> => {
    try {
        if (await isUserOnline(userId)) return;

        const timer = deliveryTimers.get(userId);
        if (timer) {
            clearTimeout(timer);
            deliveryTimers.delete(userId);
        }
    } catch (err: any) {
        console.error("[chat] cancelQueuedDeliveryIfOffline error:", err.message);
    }
};

/* ---------------- Socket handlers ---------------- */

export const registerChatHandlers = (socket: Socket<any, any, any, CustomSocketData>) => {
    const io = getIO();
    startCleanupJob();

    // --- Send one-to-one message ---
    socket.on(
        "send-message",
        async (data: { toUserId: string | number; text: string }, callback?: (res: any) => void) => {
            console.log(`[chat] send-message from=${socket.data.userId} to=${data?.toUserId}`);

            try {
                const from = socket.data.userId; // server-side value, never from the payload
                const to = String(data?.toUserId ?? "").trim();
                const text = String(data?.text ?? "").trim();

                if (!from) return callback?.({ success: false, error: "Not registered" });
                if (!to || !text) return callback?.({ success: false, error: "Invalid message" });
                if (to === from) return callback?.({ success: false, error: "Cannot message yourself" });
                if (text.length > MAX_TEXT_LENGTH) {
                    return callback?.({ success: false, error: "Message too long" });
                }

                const msg = createMessage(from, to, text);

                // Messages already waiting before this one (keeps the order correct)
                const backlog = await withTimeout(pendingCount(to), REDIS_TIMEOUT_MS, "pendingCount");

                // Save in the receiver's queue first, so the message can never be lost
                await withTimeout(storeMessage(msg), REDIS_TIMEOUT_MS, "storeMessage");
                console.log(`[chat] stored ${msg.id}, backlog=${backlog}`);

                // Sender's own tabs always see it
                io.to(`user:${from}`).emit("receive-message", { ...msg, delivered: false });

                const online = await isUserOnline(to);

                // Online and nothing waiting before it: deliver right now
                if (online && backlog === 0) {
                    const delivered = await deliverMessage(msg, false);
                    console.log(`[chat] ${msg.id} delivered immediately: ${delivered}`);

                    if (delivered) {
                        const updated = await withTimeout(markDelivered(msg), REDIS_TIMEOUT_MS, "markDelivered");
                        notifySenderDelivered(updated);
                        return callback?.({ success: true, message: updated, delivered: true, queued: false });
                    }
                }

                // Offline, older messages waiting, or the browser did not confirm: stays queued
                if (online) scheduleQueuedDelivery(to);

                console.log(`[chat] ${msg.id} queued (receiver online: ${online})`);
                callback?.({ success: true, message: msg, delivered: false, queued: true });
            } catch (err: any) {
                console.error("[chat] send-message error:", err.message);
                const redisProblem = String(err.message).includes("timed out");
                callback?.({
                    success: false,
                    error: redisProblem ? "Chat storage (Redis) is not reachable" : "Failed to send",
                });
            }
        }
    );

    // --- Load chat messages (delivered ones in their 30 minutes + my own waiting ones) ---
    socket.on(
        "get-chat-history",
        async (data: { withUserId: string | number }, callback?: (res: any) => void) => {
            try {
                const me = socket.data.userId;
                const other = String(data?.withUserId ?? "").trim();

                if (!me || !other) return callback?.({ success: false, messages: [] });

                const messages = await withTimeout(getHistory(me, other), REDIS_TIMEOUT_MS, "getHistory");
                callback?.({ success: true, messages });
            } catch (err: any) {
                console.error("[chat] get-chat-history error:", err.message);
                callback?.({ success: false, messages: [] });
            }
        }
    );
};