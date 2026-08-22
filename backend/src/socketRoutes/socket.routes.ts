import {
    handleYarnLotSelection,
    handleYarnLotClear,
    handleYarnLotDisconnect,
} from "../middleware/socket.io/handleYarnLotSelection";
import { getIO } from "../middleware/socket.io/socket";

export const initSocketRoutes = () => {
    const io = getIO();

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("yarn-lot-selected", (data) => {

            if (data?.userId) {
                socket.data.userId = String(data.userId);
            }

            handleYarnLotSelection(socket, data);
        });

        socket.on("yarn-lot-cleared", (data) => {
            console.log("Received yarn-lot-cleared:", data);
            handleYarnLotClear(socket, data);
        });

        socket.on("disconnect", (reason) => {
            console.log(`Socket disconnected: ${socket.id} (${reason})`);
            handleYarnLotDisconnect(socket, socket.data.userId);
        });
    });
};