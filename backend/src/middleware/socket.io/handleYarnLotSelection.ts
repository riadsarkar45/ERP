type Occupant = { userId: string; userName: string; stockId: string };

// lotNo -> "userId:stockId" -> Occupant
const lotUsers = new Map<string, Map<string, Occupant>>();

type UserLotContext = { lotNo: string; stockId: string; yarnCount: string };
// userId -> stockId -> context  (one user can hold several rows/lots at once)
const userCurrentLots = new Map<string, Map<string, UserLotContext>>();

const compositeKey = (userId: string, stockId: string) => `${userId}:${stockId}`;

const leaveLot = (socket: any, userId: string, ctx: UserLotContext) => {
    const { lotNo, stockId, yarnCount } = ctx;
    const key = compositeKey(userId, stockId);
    const users = lotUsers.get(lotNo);
    if (!users) return;

    users.delete(key);

    if (users.size === 0) {
        lotUsers.delete(lotNo);
        socket.leave(`lot:${lotNo}`);
    } else {
        const stillHasAnotherRowHere = [...users.values()].some((u) => u.userId === userId);
        if (!stillHasAnotherRowHere) socket.leave(`lot:${lotNo}`);
    }

    console.log(`[lot] ${userId} left lot ${lotNo} (stock ${stockId}), remaining: ${users.size}`);

    socket.to(`lot:${lotNo}`).emit("yarn-lot-deselection", {
        stockId,
        lotNo,
        yarnCount,
        userId,
        status: users.size > 0 ? "multiple-selection" : "single-selection",
    });
};

export const handleYarnLotSelection = (socket: any, data: any) => {
    const { stockId, lotNo, yarnCount, userName, userId } = data || {};

    if (!lotNo || !userId || !stockId) {
        return;
    }

    const uid = String(userId);
    const sid = String(stockId);
    const room = `lot:${lotNo}`;

    if (!userCurrentLots.has(uid)) userCurrentLots.set(uid, new Map());
    const userRows = userCurrentLots.get(uid)!;
    const previous = userRows.get(sid);

    if (previous && previous.lotNo === lotNo) {
        socket.join(room); // reconnect / re-announce safety — idempotent
        console.log(`[lot] ${uid} re-confirmed lot ${lotNo} (stock ${sid})`);
        return;
    }

    if (previous) leaveLot(socket, uid, previous);

    if (!lotUsers.has(lotNo)) lotUsers.set(lotNo, new Map());
    const users = lotUsers.get(lotNo)!;
    const existingUsers = [...users.values()].filter((u) => u.userId !== uid);

    socket.join(room);
    users.set(compositeKey(uid, sid), { userId: uid, userName, stockId: sid });
    userRows.set(sid, { lotNo, stockId: sid, yarnCount });

    console.log(`[lot] ${uid} (${userName}) joined lot ${lotNo} (stock ${sid}), others already there: ${existingUsers.length}`);

    if (existingUsers.length === 0) return;

    socket.to(room).emit("yarn-lot-selection", {
        stockId, lotNo, yarnCount, userId, userName,
        status: "multiple-selection",
    });

    socket.emit("yarn-lot-selection", {
        stockId, lotNo, yarnCount, users: existingUsers,
        status: "multiple-selection",
    });
};

export const handleYarnLotClear = (socket: any, data: any) => {
    const { stockId, userId } = data || {};
    if (!userId || !stockId) {
        console.warn("[lot] handleYarnLotClear ignored — missing field(s):", data);
        return;
    }

    const uid = String(userId);
    const sid = String(stockId);
    const userRows = userCurrentLots.get(uid);
    if (!userRows) return;

    const ctx = userRows.get(sid);
    if (!ctx) return;

    leaveLot(socket, uid, ctx);
    userRows.delete(sid);
};

export const handleYarnLotDisconnect = (socket: any, userId: string | undefined) => {
    if (!userId) {
        console.warn("[lot] disconnect fired with no userId on socket.data — nothing to clean up");
        return;
    }

    const uid = String(userId);
    const userRows = userCurrentLots.get(uid);
    if (!userRows) return;

    console.log(`[lot] ${uid} disconnected, releasing ${userRows.size} held lot(s)`);
    for (const ctx of userRows.values()) leaveLot(socket, uid, ctx);
    userCurrentLots.delete(uid);
};