import cors from "cors";
import express, { Request, Response } from "express";
import { initializeAllConnections, AppDataSource } from "./src/database/connection";
import "./src/utils/passport";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'].filter(Boolean);

const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

//routes

import constants from "./src/helpers/constants";
import authRoutes from "./src/routes/auth.routes";
// import fileRoutes from "./src/routes/files.routes";
import logRoutes from "./src/routes/notification.routes";
// import secRoutes from "./src/routes/secuity.routes";
// import editLangrouter from "./src/routes/user/user.routes";

import attendanceRoutes from "./src/routes/Attendance/attendance.routes";
import { AttendanceEventScheduler } from "./src/services/Attendance/attendanceEventScheduler.service";
import { FaceRecognitionService } from "./src/services/Attendance/face_recognition.service";
import { AttendanceService } from "./src/services/Attendance/Attendance.service";

//----------------routes-------------

// app.use("/api/files", fileRoutes);

app.use("/api/auth", authRoutes);

// app.use("/api/security", secRoutes);

app.use("/api/notification", logRoutes);

app.use("/api/attendance", attendanceRoutes);

let serverReady = false;

app.get("/health", (req: Request, res: Response) => {
  if (!serverReady) {
    res.status(503).json({ status: "starting", message: "Models loading or DB connecting" });
    return;
  }
  res.status(constants.STATUS_CODES.OK).send("Server is up and running.");
  return;
});

const PORT = process.env.PORT || 3500;

// Server will start after initialization completes so startup logs
// show models/DB readiness in order.

async function startServerWithTypeORM() {
  try {
    console.log("Initializing DB and face models in parallel...");

    // Run DB and face model loading truly in parallel
    // facePromise does NOT need DB — safe to run concurrently
    const facePromise = FaceRecognitionService.getInstance();
    const [dbResult, faceResult] = await Promise.allSettled([
      initializeAllConnections(),
      facePromise,
    ]);



    if (dbResult.status === "fulfilled") {
      console.log("✅ Database ready");
    } else {
      console.warn("⚠️  DB init failed (non-fatal):", dbResult.reason?.message);
    }

    await waitForTypeORM(60000);
    if (faceResult.status === "fulfilled") {
      try {
        const faceService = await FaceRecognitionService.getInstance();

        console.log("✅ Face descriptor store loaded");
      } catch (e: any) {
        console.warn("⚠️  Descriptor store failed (will lazy-load on first request):", e?.message);
      }
    }

    try {
      await AttendanceEventScheduler.initializeScheduler();
      console.log("✅ Attendance scheduler ready");
    } catch (e: any) {
      console.warn("⚠️  Scheduler init failed (non-fatal):", e?.message);
    }

    serverReady = true;
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    server.on('error', (err: any) => {
      console.error('HTTP server error:', err instanceof Error ? err.stack : err);
    });

  } catch (err) {
    console.error("Startup failed:", err instanceof Error ? err.stack : err);
    process.exit(1);
  }
}

async function waitForTypeORM(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (AppDataSource.isInitialized) {
      console.log("✅ TypeORM confirmed initialized");
      return;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.warn("⚠️  TypeORM not confirmed within timeout — descriptors will lazy-load");
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err instanceof Error ? err.stack : err);
  process.exit(1);
});

startServerWithTypeORM().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
