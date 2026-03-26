import cors from "cors";
import express, { Request, Response } from "express";
import { initializeAllConnections } from "./src/database/connection";
import "./src/utils/passport";

const app = express();

app.use(cors());

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

app.get("/health", (req: Request, res: Response) => {
  res.status(constants.STATUS_CODES.OK).send("Server is up and running.");
  return;
});

const PORT = process.env.PORT || 3500;

async function startServerWithTypeORM() {
  try {
    console.log("Initializing TypeORM and Oracle connections...");

    const connectionPromise = initializeAllConnections();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (30s)")), 30000)
    );

    try {
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (err) {
      console.warn(
        "continuing startup while connections initialize in background",
        err instanceof Error ? err.message : String(err)
      );
      connectionPromise.catch((e) =>
        console.error("Background DB initialization failed:", e)
      );
    }
    await AttendanceEventScheduler.initializeScheduler();
      try {
        console.log('Preloading face recognition models (FaceRecognitionService)...');
        await FaceRecognitionService.getInstance();
        if (typeof FaceRecognitionService.warmUp === 'function') {
          await FaceRecognitionService.warmUp();
        }
        console.log('Face recognition models preloaded');
      } catch (modelErr) {
        console.warn('Face recognition model preload failed, continuing startup:', modelErr instanceof Error ? modelErr.message : modelErr);
      }

      // Also ensure AttendanceService initialises its dependencies (lazy init) to reduce first-request latency.
      try {
        console.log('Preloading AttendanceService face dependencies...');
        await Promise.race([
          AttendanceService.initializeFaceService(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AttendanceService preload timed out')), 20000))
        ]);
        console.log('AttendanceService face dependencies preloaded');
      } catch (attErr) {
        console.warn('AttendanceService preload failed or timed out, continuing startup:', attErr instanceof Error ? attErr.message : attErr);
      }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`TypeORM is ready for model conversion`);
    });
  
  } catch (err) {
    console.error("Error in database connection:", err);
    console.error("Full error:", err instanceof Error ? err.stack : String(err));
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServerWithTypeORM();
