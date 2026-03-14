import { Request, Response } from "express";
import { FaceRecognitionService } from "../../services/Attendance/face_recognition.service";
import { AttendanceService } from "../../services/Attendance/Attendance.service";
import { validateImage } from "../../middleware/security.middleware";
import logger from "../../utils/logger";

try {
  require('@tensorflow/tfjs-node');
  logger.info('tfjs-node backend loaded for face-api');
} catch (err) {
  logger.warn('tfjs-node not available or failed to load (you can install @tensorflow/tfjs-node for faster inference):', err);
}

export class AttendanceController {
  
static async markAttendance(req: Request, res: Response): Promise<void> {
     try {
      const { 
        action, 
        latitude, 
        longitude, 
        accuracy, 
        locationType, 
        address, 
        officeName 
      } = req.body;
      
      const file = req.file;

      if (!file) {
        logger.warn("Attendance marking attempt without image");
        res.status(400).json({ error: "Face image is required" });
        return;
      }

      if (!["check-in", "check-out"].includes(action)) {
        logger.warn(`Invalid attendance action: ${action}`);
        res.status(400).json({ error: "Invalid action" });
        return;
      }

      // Validate image
      validateImage(req, res, () => {});

      const faceService = await FaceRecognitionService.getInstance();
      try {
        if (typeof (faceService as any).ensureModelsLoaded === 'function') {
          await (faceService as any).ensureModelsLoaded();
        } else if (typeof (faceService as any).loadModels === 'function') {
          await (faceService as any).loadModels();
        } else if ((faceService as any).modelsLoaded === false) {
          for (let i = 0; i < 5 && (faceService as any).modelsLoaded === false; i++) {
            await new Promise(r => setTimeout(r, 200));
          }
        }
      } catch (err) {
        logger.warn('Face recognition service models ensure/load attempt failed (continuing and will retry on inference):', err);
      }

      let descriptor;
      try {
        descriptor = await faceService.extractFaceDescriptor(file.buffer);
      } catch (err: any) {
        const msg = err?.message || String(err);
        logger.warn('Face descriptor extraction failed (attempting to reload models):', msg);
        try {
          if (typeof (faceService as any).loadModels === 'function') {
            await (faceService as any).loadModels();
          } else if (typeof (faceService as any).ensureModelsLoaded === 'function') {
            await (faceService as any).ensureModelsLoaded();
          }
        } catch (loadErr) {
          logger.error('Failed to load face-api models during fallback:', loadErr);
        }
        
        descriptor = await faceService.extractFaceDescriptor(file.buffer);
      }
       const match = await faceService.findBestMatch(descriptor);

      if (!match) {
        logger.warn("Unrecognized face attempt");
        res.status(404).json({ error: "Employee not recognized" });
        return;
      }

      // Prepare location data
      let locationData: any = null;
      if (latitude && longitude) {
        locationData = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : null,
          locationType: locationType || 'unknown',
          officeName: officeName || null
        };

        if (address) {
          try {
            locationData.address = typeof address === 'string' ? JSON.parse(address) : address;
          } catch (e) {
            locationData.address = { fullAddress: address };
          }
        }
      }

      // Use new auto-confirm method
      const result = await AttendanceService.markAttendanceWithAutoConfirm(
        match.employeeId,
        action,
        file.buffer,
        locationData
      );

      res.status(200).json({
        success: true,
        requires_confirmation: result.requiresConfirmation,
        uuid: result.uuid,
        employeeCode: result.employeeCode,
        employeeName: result.employeeName,
        action: action,
        status: result.status,
        timestamp: result.timestamp.toISOString(),
        confidence: result.confidence,
        recognized_employee: result.recognizedEmployee
      });

    } catch (error: unknown) {
      logger.error("Attendance marking error", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }

static async confirmAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { uuid, confirmed_by = 'user' } = req.body;

      if (!uuid) {
        logger.error(`[CONFIRM-CTRL] Missing UUID in request`);
        res.status(400).json({ error: "UUID is required" });
        return;
      }

      logger.info(`[CONFIRM-CTRL] Request received for UUID: ${uuid}, confirmed_by: ${confirmed_by}`);
      const startTime = Date.now();
      
      const result = await AttendanceService.confirmAttendance(uuid, confirmed_by);
      const duration = Date.now() - startTime;
      
      logger.info(`[CONFIRM-CTRL] Service returned result in ${duration}ms:`, { 
        found: result.found, 
        alreadyProcessed: result.alreadyProcessed,
        status: result.status 
      });

      const responsePayload = {
        success: true,
        message: "✅ Attendance confirmed successfully",
        data: result,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(responsePayload);
      
      logger.info(`[CONFIRM-CTRL] ✅ Response sent to client for UUID: ${uuid}`);

    } catch (error: unknown) {
      logger.error("Attendance confirmation error", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
      logger.error(`[CONFIRM-CTRL] ❌ Error response sent for UUID`);
    }
  }

static async cancelAttendance(req: Request, res: Response): Promise<void> {
  try {
    const { 
      uuid, 
      actual_employee_code, 
      actual_employee_name,
      reason = 'proxy_detected_by_user'
    } = req.body;

    logger.info(`[CANCEL-CTRL] Cancel request received - UUID: ${uuid}, Reason: ${reason}`);

    if (!uuid || !actual_employee_name) {
      logger.warn(`[CANCEL-CTRL] Missing required fields - UUID: ${uuid}, Name: ${actual_employee_name}`);
      res.status(400).json({ 
        error: "UUID and actual_employee_name are required" 
      });
      return;
    }

    const validatedEmployeeCode = actual_employee_code || 'UNREGISTERED_' + Date.now();
    const validatedEmployeeName = actual_employee_name || 'Unknown Employee';

    logger.info(`[CANCEL-CTRL] Calling service with - UUID: ${uuid}, Code: ${validatedEmployeeCode}, Reason: ${reason}`);

    const result = await AttendanceService.cancelAttendance(
      uuid, 
      validatedEmployeeCode, 
      validatedEmployeeName,
      reason 
    );

    logger.info(`[CANCEL-CTRL] Service returned - Success: ${result.success}, HasProxyLog: ${!!result.proxyLog}, EmailSent: ${result.emailSent}`);

    res.status(200).json({
      success: true,
      message: "Attendance cancelled - Proxy attempt logged",
      data: result
    });

  } catch (error: unknown) {
    logger.error("Attendance cancellation error", error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
 }
static async getProxyLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, start_date, end_date, employee_code } = req.query;

      const result = await AttendanceService.getProxyLogs({
        page: page as string,
        limit: limit as string,
        start_date: start_date as string,
        end_date: end_date as string,
        employee_code: employee_code as string
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: unknown) {
      logger.error("Proxy logs fetch error", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }

  // Keep existing methods
  static async getAttendanceReport(req: Request, res: Response): Promise<void> {
   
    try {
      const { from_date, to_date, department, page, limit } = req.query;
      logger.info("Received query parameters:", req.query);

      if (!from_date || !to_date) {
        res.status(400).json({ error: "From date and to date are required" });
        return;
      }

      const report = await AttendanceService.getAttendanceReport(
        new Date(from_date as string),
        new Date(to_date as string),
        department as string | undefined,
        Number(page) || 1,
        Number(limit) || 20
      );

      res.status(200).json(report);
    } catch (error: unknown) {
      logger.error("Attendance report error", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  
  }

  static async stopAutoConfirm(req: Request, res: Response): Promise<void> {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      res.status(400).json({ error: "UUID is required" });
      return;
    }

    const wasStopped = AttendanceService.stopAutoConfirm(uuid);

    res.status(200).json({
      success: true,
      message: "Auto-confirm stopped successfully",
      wasStopped: wasStopped
    });

  } catch (error: unknown) {
    logger.error("Stop auto-confirm error", error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message });
  }
  }

  //  Get ALL attendance records for a date range (month view)
  //   Handles large datasets (2000+ records) without hitting Oracle IN clause limits
   
  static async getFullMonthAttendanceReport(req: Request, res: Response): Promise<void> {
    try {
      const { from_date, to_date, department } = req.query;
      logger.info("Fetching full month attendance report:", req.query);

      if (!from_date || !to_date) {
        res.status(400).json({ error: "From date and to date are required" });
        return;
      }

      const allRecords = await AttendanceService.getFullMonthAttendanceReport(
        new Date(from_date as string),
        new Date(to_date as string),
        department as string | undefined
      );

      res.status(200).json({
        success: true,
        total: allRecords.length,
        data: allRecords
      });
    } catch (error: unknown) {
      logger.error("Full month attendance report error", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }

  // Create a pending attendance request (fallback manual request)
  static async createAttendanceRequest(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file as Express.Multer.File | undefined;
      const { employee_code, event_type } = req.body;
      const requestedBy = (req as any).user?.loginid || null;

      if (!employee_code || !event_type) {
        res.status(400).json({ success: false, message: 'employee_code and event_type are required' });
        return;
      }

      if (!file) {
        res.status(400).json({ success: false, message: 'Image file is required' });
        return;
      }

      const result = await AttendanceService.createAttendanceRequest(employee_code, event_type, file.buffer, requestedBy);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error('Create attendance request error', error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }

  static async listAttendanceRequests(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, status } = req.query;
      const data = await AttendanceService.listAttendanceRequests({ page, limit, status });
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      logger.error('List attendance requests error', error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }

  static async approveAttendanceRequest(req: Request, res: Response): Promise<void> {
    try {
      // const { id } = req.params;
      const { id } = req.params as { id: string };
      const approvedBy = (req as any).user?.loginid || 'system';
      const { notes } = req.body;

      if (!id) {
        res.status(400).json({ success: false, message: 'Request id is required' });
        return;
      }

      const result = await AttendanceService.approveAttendanceRequest(id, approvedBy, notes);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error('Approve attendance request error', error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }


  static async rejectAttendanceRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };;
      const approvedBy = (req as any).user?.loginid || 'system';
      const { notes } = req.body;

      if (!id) {
        res.status(400).json({ success: false, message: 'Request id is required' });
        return;
      }

      const result = await AttendanceService.rejectAttendanceRequest(id, approvedBy, notes);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      logger.error('Reject attendance request error', error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message });
    }
  }
}
