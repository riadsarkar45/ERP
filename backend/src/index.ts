import express from "express";
import type { Request, Response } from "express";
import { connectDatabase, disconnectDatabase } from "./database/connect";
import cors from "cors";
import router from "./routes/post";
import getRouters from "./routes/get";
import updateRouters from "./routes/update";
import { initSocket } from "./middleware/socket.io/socket";
import { trackRequests } from "./middleware/rateLimiter/trackRequest";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,https://erp-three-pied.vercel.app").split(",");
const PORT = parseInt(process.env.PORT || "3000", 10);

app.set('trust proxy', 1);
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(trackRequests);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "ERP Backend Running", version: "1.0" });
});

process.on("SIGINT", async () => {
  console.log("\n Shutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n Shutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
});

const start = async () => {
  try {
    await connectDatabase();

    app.use("/api", router);
    app.use("/api", getRouters);
    app.use("/api", updateRouters);

    app.use(errorHandler);

    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });

    initSocket(server);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();