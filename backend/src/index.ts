import express from "express";
import type { Request, Response } from "express";
import { connectDatabase, disconnectDatabase } from "./database/connect";
import cors from "cors";
import router from "./routes/post";
import getRouters from "./routes/get";
import updateRouters from "./routes/update";
import { initSocket } from "./middleware/socket.io/socket";
import { trackRequests } from "./middleware/rateLimiter/trackRequest";
import authRouter from "./routes/auth/auth.Routes";
import cookieParser from "cookie-parser";
const app = express();
app.use(cookieParser())
const corsOrigins = ["https://erp-three-pied.vercel.app", "http://localhost:5173", "https://erp-backend-ruby.vercel.app"];
app.set('trust proxy', 1); // Trust the first proxy (if behind a reverse proxy)
app.use(cors(
  {
    origin: corsOrigins,
    credentials: true,
  }
))
app.get("/", (req: Request, res: Response) => {
  res.send("Hello");
});
app.use(trackRequests);

app.use(express.json());




process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDatabase();
  process.exit(0);
});
const PORT = 3000;

const start = async () => {
  await connectDatabase();

  app.use("/api", router)
  app.use("/api", getRouters)
  app.use("/api", updateRouters)
  app.use("/api", authRouter)
  
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  initSocket(server);
};

start();