import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";

import { clerkMiddleware } from "@clerk/express";
import { requireAuth } from "./middleware/auth";
// import expressWs from "express-ws";
import logsRoute from "./routes/logs";
import metricsRoute from "./routes/metrics";
import voiceRoute from "./routes/voicelog";
import usersRoute from "./routes/users";
import insightsRoute from "./routes/insights";

import { AuthenticatedRequest } from "./middleware/auth";

dotenv.config();
const app = express();

app.use(cors({}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

app.get("/health", (req: Request, res: Response) => {
  res.send("server is healthy!");
});

app.use("/test", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: "You're authenticated" });
});

app.use("/api/logs", logsRoute);
app.use("/api/metrics", metricsRoute);
app.use("/api/voice-log", voiceRoute);
app.use("/api/users", usersRoute);
app.use("/api/insights", insightsRoute);

// app.ws("/stream", (ws) => {
//   console.log("WebSocket connected");

//   ws.on("message", async (data: ArrayBuffer) => {
//     const blob = new Blob([data], { type: "audio/webm" });
//     const transcription = await transcribe(blob);
//     console.log(transcription);
//   });
// });
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 4000;

app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log("Error: address already in use");
    } else {
      console.log(err);
    }
  });
