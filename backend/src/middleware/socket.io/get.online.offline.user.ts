import { getIO } from "./socket";

/**
 * Returns an array of unique user IDs currently connected via Socket.IO.
 */
export const getOnlineUsers = async (): Promise<string[]> => {
    const io = getIO();
    const sockets = await io.fetchSockets();

    const onlineUsers = new Set<string>();

    for (const socket of sockets) {
        const userId = socket.data?.userId;

        // Ensure userId exists and is valid
        if (userId && userId !== "undefined" && userId !== "null") {
            onlineUsers.add(String(userId));
        }
    }

    return Array.from(onlineUsers);
};

/**
 * Helper to get online and offline status purely from a provided list of all system user IDs.
 */
export const getOnlineAndOfflineUsers = async (allUserIds: (string | number)[]) => {
    const onlineUsers = await getOnlineUsers();
    const onlineSet = new Set(onlineUsers);

    const offlineUsers = allUserIds
        .map((id) => String(id))
        .filter((id) => !onlineSet.has(id));

    return {
        onlineUsers,
        offlineUsers,
    };
};