import { getIO } from "./socket";

interface ChallanData {
    challanId: number;
    userId: number;
}

export const downloadableChallans = (challanIds: ChallanData[]) => {
    if (!challanIds || challanIds.length === 0) {
        return {
            success: false,
            message: `Challan ids haven't reached the main function.`,
        };
    }

    console.log(challanIds, "challan ids");

    const io = getIO();

    const userIds = challanIds.map((challan) => challan.userId);

    console.log(userIds, "user ids");

    return userIds;
};