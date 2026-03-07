import express from "express";
import type { Request, Response } from "express";
import { connectDatabase, disconnectDatabase } from "./database/connect";
import cors from "cors";
import router from "./routes/post";
import getRouters from "./routes/get";
const app = express();
app.use(cors(
  {
    origin: "http://localhost:5173",
    credentials: true,
  }
))
app.get("/", (req: Request, res: Response) => {
  res.send("Hello");
});

app.use(express.json());
app.use("/api", router)
app.use("/api", getRouters)


process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDatabase();
  process.exit(0);
});
const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDatabase();
})