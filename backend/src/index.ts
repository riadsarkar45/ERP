import express from "express";
import type { Request, Response } from "express";
import { connectDatabase, disconnectDatabase } from "./database/connect";
import { fileUpload } from "./controllers/uploads/upload";

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello");
});

app.post("/upload", fileUpload)

process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDatabase();
  process.exit(0);
});
const PORT = 3000;
app.listen(PORT, async() => {
  console.log(`Server is running on port ${PORT}`);
  await connectDatabase();
})