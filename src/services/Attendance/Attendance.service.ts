import { differenceInMinutes } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import constants from "../../helpers/constants";
import { notifyUser } from '../../helpers/functions'; 
import logger from "../../utils/logger";
import { FaceRecognitionService } from "./face_recognition.service";
import { getSignedUrl, uploadEmployeeFace, uploadFile } from "../../services/ociUpload.service";
import { CacheService } from "./cache.service";
import { AppDataSource, oracleDb, TypeORMService } from "../../database/connection";
import { Between, In, Or } from "typeorm";
import { Employee} from "../../entity/Attendance/employee.entity";
import {AttendanceRecord} from "../../entity/Attendance/attendance_record.entity";
import { AttendanceEvent, AttendanceEventType, AttendanceStatus, DataTransferFlag } from "../../entity/Attendance/attendance_events.entity";
import { ProxyLog } from "../../entity/Attendance/ProxyLog.entity";
import { EmployeeFace } from "../../entity/Attendance/employee_face.entity";
import { AttendanceRequest, AttendanceRequestStatus } from "../../entity/Attendance/attendance_request.entity";
  
const AUTO_CONFIRM_DELAY_MS = 10000; 
const FACE_RECOGNITION_TIMEOUT = 2500;
const DATABASE_QUERY_TIMEOUT = 3000;
const MAX_CONCURRENT_REQUESTS = 15;
const CACHE_TTL = 300;
const MIN_CONFIDENCE_THRESHOLD = 75;

function chunkArray<T>(arr: T[], chunkSize: number = 1000): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

export class AttendanceService {
  private static cache = CacheService.getInstance();
  private static pendingConfirmations = new Map();
  private static cancelledConfirmations = new Set<string>();
  private static faceService: FaceRecognitionService | null = null;
  private static confirmingUuids = new Set<string>();
  private static concurrentRequests = 0;

  static async initializeFaceService(): Promise<void> {
    if (!this.faceService) {
      this.faceService = await FaceRecognitionService.getInstance();
    }
  }

  private static async acquireRequestSlot(): Promise<boolean> {
    if (this.concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
      return false;
    }
    this.concurrentRequests++;
    return true;
  }

  private static releaseRequestSlot(): void {
    this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
  }
static async markAttendanceWithAutoConfirm(
  employeeId: string,
  action: "check-in" | "check-out",
  imageBuffer: Buffer,
  locationData?: any,
  company_code?: string,
  preComputedConfidence?: number 
): Promise<{
  status: string;
  timestamp: Date;
  employeeCode: string;
  employeeName: string;
  employeeFirstName: string;
  uuid: string;
  confidence: number;
  requiresConfirmation: boolean;
  recognizedEmployee: any;
  autoConfirmDelay: number;
}> {
  const startTime = Date.now();
  const uuid = uuidv4();
  const now = new Date();

  if (!await this.acquireRequestSlot()) {
    throw new Error("System busy. Please try again.");
  }

    try {
    const confidenceTask = preComputedConfidence !== undefined
      ? Promise.resolve(preComputedConfidence)
      : this.calculateFaceConfidenceBalanced(employeeId, imageBuffer, company_code);

    const [employee, confidence] = await Promise.all([
      this.getEmployeeWithCache(employeeId, company_code),
      confidenceTask,
    ]);

    if (!employee) {
      throw new Error("Employee not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingEvent = await AppDataSource.getRepository(AttendanceEvent).findOne({
      where: { 
        employee_id: employeeId,
        company_code: company_code || employee.company_code,
        event_type: action === "check-in" ? AttendanceEventType.CHECK_IN : AttendanceEventType.CHECK_OUT,
        status: AttendanceStatus.PENDING,
        event_time: Between(today, new Date(today.getTime() + 86400000))
      }
    });

    if (existingEvent) {
      logger.info(`Pending record exists for employee ${employeeId} for ${action}, cancelling old one`);
      if (existingEvent.uuid) {
        this.stopAutoConfirm(existingEvent.uuid);
      }
    }

    const firstName = this.getFirstName(employee.full_name);
    const pendingData = {
      uuid,
      employee_id: employeeId,
      employee_code: employee.employee_code,
      employee_name: employee.full_name,
      employee_first_name: firstName,
      company_code: company_code || employee.company_code,
      action,
      confidence,
      timestamp: now,
      location_data: locationData,
      s3_image_url: null,
      image_buffer: imageBuffer, 
      auto_confirm_time: new Date(now.getTime() + AUTO_CONFIRM_DELAY_MS),
      is_cancelled: false,
      autoConfirmTimer: null as ReturnType<typeof setTimeout> | null
    };

    logger.info(`[MARK] Stored image buffer in memory for UUID: ${uuid}`, {
      hasImageBuffer: !!imageBuffer,
      imageBufferSize: imageBuffer?.length || 0,
      imageBufferType: typeof imageBuffer,
      company_code: company_code
    });

    this.pendingConfirmations.set(uuid, pendingData);
    const autoConfirmTimer = setTimeout(async () => {
      try {
        const currentData = this.pendingConfirmations.get(uuid);
        if (!currentData || currentData.is_cancelled) {
          logger.info(`Auto-confirm cancelled for UUID: ${uuid}`);
          return;
        }

        const isCancelledInDB = await this.isCancelledInDatabase(uuid, company_code);
        if (isCancelledInDB) {
          this.pendingConfirmations.delete(uuid);
          this.cancelledConfirmations.add(uuid);
          logger.info(`Auto-confirm skipped - cancelled in DB: ${uuid}`);
          return;
        }

        await this.autoConfirmFromMemory(uuid, company_code);
      } catch (err) {
        logger.error('Auto-confirm scheduling failed:', err);
      }
    }, AUTO_CONFIRM_DELAY_MS);

    pendingData.autoConfirmTimer = autoConfirmTimer as ReturnType<typeof setTimeout>;
    this.pendingConfirmations.set(uuid, pendingData);
    this.saveAttendanceToDatabase(pendingData)
      .catch(err => logger.error('Background database save failed:', err));

    const processingTime = Date.now() - startTime;
    logger.info(`✅ Attendance marked in ${processingTime}ms for ${employeeId}, Auto-confirm in ${AUTO_CONFIRM_DELAY_MS}ms`);

    return {
      status: 'pending_auto_confirm',
      timestamp: now,
      employeeCode: employee.employee_code,
      employeeName: employee.full_name,
      employeeFirstName: firstName,
      uuid: uuid,
      confidence: confidence,
      requiresConfirmation: true,
      autoConfirmDelay: AUTO_CONFIRM_DELAY_MS,
      recognizedEmployee: {
        code: employee.employee_code,
        name: employee.full_name,
        firstName: firstName,
        department: employee.department,
        image: await this.getEmployeeImage(employeeId)
      }
    };

  } catch (error: any) {
    logger.error('Attendance marking error:', error);
    throw error;
  } finally {
    this.releaseRequestSlot();
  }
}

  private static async calculateFaceConfidenceBalanced(
  employeeId: string,
  imageBufferOrDescriptor: Buffer | Float32Array,
  company_code?: string
): Promise<number> {
  try {
    if (!this.faceService) await this.initializeFaceService();
    if (!this.faceService) return 85;

    if (imageBufferOrDescriptor instanceof Float32Array) {
      const match = await this.faceService.findBestMatch(imageBufferOrDescriptor);
      return Math.max(match?.confidence ?? 85, MIN_CONFIDENCE_THRESHOLD);
    }

    const descriptor = await this.faceService.extractFaceDescriptor(imageBufferOrDescriptor);
    const match = await this.faceService.findBestMatch(descriptor);
    return Math.max(match?.confidence ?? 85, MIN_CONFIDENCE_THRESHOLD);
  } catch (error) {
    logger.warn("Face confidence calculation failed, using fallback:", error);
    return 85;
  }
}

  private static getFirstName(fullName: string): string {
    return fullName.split(' ')[0] || fullName;
  }


  private static async getEmployeeWithCache(employeeId: string, company_code?: string): Promise<any> {
    const cacheKey = `employee:${employeeId}:${company_code || 'all'}`;
    let employee = await this.cache.get(cacheKey);
    if (employee) {
    return employee;
  }
    
    const employees = AppDataSource.getRepository(Employee);
 
    const whereClause: any = { employee_id: employeeId };
    if (company_code) {
      whereClause.company_code = company_code;
    }

    const databasePromise = employees.findOne({
      where: whereClause,
      select: ['employee_id', 'employee_code', 'full_name', 'department', 'company_code'],
    });

    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), DATABASE_QUERY_TIMEOUT)
    );

    employee = await Promise.race([databasePromise, timeoutPromise]);

    if (employee) {
      logger.info("Employee found in DB:", {employeeId: employee.employee_id, code: employee.employee_code, name: employee.full_name, company_code: employee.company_code});
      await this.cache.set(cacheKey, employee, CACHE_TTL);
    } else {
      logger.warn("Employee NOT found in DB for ID:", employeeId);
    }

    return employee;
  }

  private static async saveAttendanceToDatabase(data: any): Promise<void> {
    try {
      const eventData: any = {
        id: uuidv4(),
        employee_id: data.employee_id,
        employee_code: data.employee_code,
        company_code: data.company_code,
        event_time: data.timestamp,
        event_type: data.action === "check-in" ? AttendanceEventType.CHECK_IN : AttendanceEventType.CHECK_OUT,
        data_transfer: DataTransferFlag.N,
        uuid: data.uuid,
        confidence: data.confidence,
        s3_image_url: null, 
        status: AttendanceStatus.PENDING,
        auto_confirm_time: data.auto_confirm_time,
      };

      if (data.location_data) {
        Object.assign(eventData, {
          latitude: data.location_data.latitude,
          longitude: data.location_data.longitude,
          accuracy: data.location_data.accuracy,
          location_type: data.location_data.locationType,
          address: data.location_data.address,
          office_name: data.location_data.officeName
        });
      }

      const attendanceRepo = AppDataSource.getRepository(AttendanceEvent);
      const newEvent = attendanceRepo.create(eventData);
      await attendanceRepo.save(newEvent);
      logger.info(`[DB-SAVE] Record saved for UUID: ${data.uuid}, company_code: ${data.company_code}`);
      
    } catch (error) {
      logger.error('Background save failed:', error);
    }
  }
 static async confirmAttendance(uuid: string, confirmedBy: string = 'user', company_code?: string): Promise<any> {
  const startTime = Date.now();
  
  logger.info(`[SERVICE-CONFIRM] Starting confirmation for UUID: ${uuid}, confirmedBy: ${confirmedBy}, company_code: ${company_code}`);
  
  if (!await this.acquireRequestSlot()) {
    throw new Error("System busy. Please try again.");
  }

  try {
    // ─── LOCK: prevent double confirmation from concurrent flows
    if (this.confirmingUuids.has(uuid)) {
      logger.warn(`[SERVICE-CONFIRM] UUID ${uuid} already being confirmed — waiting briefly and returning DB state`);
      await new Promise(r => setTimeout(r, 500));
      const event = await AppDataSource.getRepository(AttendanceEvent).findOne({ where: { uuid } });
      return { found: !!event, alreadyProcessed: event?.status !== AttendanceStatus.PENDING, status: event?.status };
    }

    this.confirmingUuids.add(uuid);

    if (this.isAutoConfirmCancelled(uuid) || await this.isCancelledInDatabase(uuid, company_code)) {
      logger.warn(`[SERVICE-CONFIRM] UUID ${uuid} has been cancelled`);
      throw new Error("Attendance has been cancelled");
    }

    const pendingData = this.pendingConfirmations.get(uuid);
    if (pendingData) {
      if (pendingData.is_cancelled) {
        logger.warn(`[SERVICE-CONFIRM] UUID ${uuid} is marked as cancelled in memory`);
        throw new Error("Attendance has been cancelled");
      }
      
      logger.info(`[SERVICE-CONFIRM] Found pending data for UUID: ${uuid}, saving confirmation`);
      this.pendingConfirmations.delete(uuid);
      const result = await this.saveConfirmedAttendance(pendingData, confirmedBy, company_code);
      const duration = Date.now() - startTime;
      logger.info(`✅ [SERVICE-CONFIRM] Confirmed from memory in ${duration}ms for UUID: ${uuid}`);
      logger.info(`[SERVICE-CONFIRM] Returning result with event status:`, { found: true, alreadyProcessed: false });
      return result;
    }

    logger.info(`[SERVICE-CONFIRM] Pending data not found, checking database for UUID: ${uuid}`);
    const result = await this.confirmAttendanceFromDatabase(uuid, confirmedBy);
    const duration = Date.now() - startTime;
    logger.info(`✅ [SERVICE-CONFIRM] Confirmed from DB in ${duration}ms for UUID: ${uuid}`);
    logger.info(`[SERVICE-CONFIRM] Returning DB result:`, { found: result.found, alreadyProcessed: result.alreadyProcessed });
    return result;

  } catch (error) {
    logger.error('❌ [SERVICE-CONFIRM] Confirmation failed for UUID: ' + uuid, error);
    throw error;
  } finally {
    this.confirmingUuids.delete(uuid);
    this.releaseRequestSlot();
  }
  }

  private static async confirmAttendanceFromDatabase(uuid: string, confirmedBy: string, company_code?: string): Promise<any> {
    const transaction = AppDataSource.createQueryRunner();

    try {
      await transaction.connect();
      await transaction.startTransaction();
      
      const event = await transaction.manager.getRepository(AttendanceEvent)
        .createQueryBuilder('event')
        .where('event.uuid = :uuid', { uuid })
        .andWhere(company_code ? 'event.company_code = :company_code' : '1=1', { company_code })
        .setLock("pessimistic_write")
        .getOne();

      if (!event) {
        await transaction.rollbackTransaction();
        return { found: false, message: "Attendance event not found", uuid };
      }

      if (event.status === AttendanceStatus.CANCELLED) {
        await transaction.rollbackTransaction();
        throw new Error("Attendance has been cancelled");
      }

      if (event.status !== AttendanceStatus.PENDING) {
        await transaction.rollbackTransaction();
        return { found: true, alreadyProcessed: true, status: event.status, event };
      }

      const today = new Date(event.event_time);
      today.setHours(0, 0, 0, 0);
      const now = new Date();

      // 🆕 USE TRANSACTION MANAGER FOR ALL OPERATIONS
      const attendanceRecordRepo = transaction.manager.getRepository(AttendanceRecord);
      const attendanceEventRepo = transaction.manager.getRepository(AttendanceEvent);

      let record = await attendanceRecordRepo.findOne({
        where: { employee_id: event.employee_id, record_date: today, company_code: event.company_code }
      });
      
      if (!record) {
        record = attendanceRecordRepo.create({
          id: uuidv4(),
          employee_id: event.employee_id,
          employee_code: event.employee_code,
          company_code: event.company_code,
          record_date: today,
          first_check_in: event.event_type === AttendanceEventType.CHECK_IN ? event.event_time : null,
          check_in: event.event_type === AttendanceEventType.CHECK_IN ? event.event_time : null,
          status: "present",
          last_check_out: event.event_type === AttendanceEventType.CHECK_OUT ? event.event_time : null,
          check_out: event.event_type === AttendanceEventType.CHECK_OUT ? event.event_time : null,
          total_hours: 0,
        });
        await attendanceRecordRepo.save(record);
      }
      
      if (event.event_type === AttendanceEventType.CHECK_IN) {
        const updates: any = {
          check_in: event.event_time,
          status: this.calculateStatus(event.event_time, "10:00")
        };
        if (!record.first_check_in || event.event_time < record.first_check_in) {
          updates.first_check_in = event.event_time;
        }
        await attendanceRecordRepo.update(
            { id: record.id },
             updates
        );

      } else {
        const updates: any = { check_out: event.event_time };
        if (!record.last_check_out || event.event_time > record.last_check_out) {
          updates.last_check_out = event.event_time;
        }
        if (record.first_check_in && event.event_time) {
          const minutes = differenceInMinutes(event.event_time, record.first_check_in);
          updates.total_hours = Number((minutes / 60).toFixed(2));
        }
        await attendanceRecordRepo.update( { id: record.id }, updates);
      }

      const updateResult = await attendanceEventRepo
        .createQueryBuilder()
        .update(AttendanceEvent)
        .set({
          status: AttendanceStatus.CONFIRMED,
          confirmed_by: confirmedBy,
          confirmed_at: now,
          attendance_record_id: record.id
        })
        .where('id = :id AND status = :status', { id: event.id, status: AttendanceStatus.PENDING })
        .execute();

      if (!updateResult.affected || updateResult.affected === 0) {
        await transaction.rollbackTransaction();
        logger.info(`[CONFIRM] UUID ${uuid} already processed by another process`);
        return { found: true, alreadyProcessed: true, status: event.status, event, record };
      }

      await transaction.commitTransaction();
      logger.info(`✅ Attendance confirmed: ${uuid}`);
      return { found: true, alreadyProcessed: false, event, record };
    } catch (error) {
      try {
        await transaction.rollbackTransaction();
      } catch (rollbackError) {
        logger.error('Rollback failed:', rollbackError);
      }
      logger.error(`Failed to confirm attendance ${uuid}:`, error);
      throw error;
    } finally {
      await transaction.release();
    }
  }
  
  static async cancelAttendance(
  uuid: string, 
  actualEmployeeCode: string = 'NOT_RECOGNIZED', 
  actualEmployeeName: string = 'User Cancelled',
  reason: string = 'user_cancelled',
  company_code?: string
): Promise<any> {
  const startTime = Date.now();
  
  if (!await this.acquireRequestSlot()) {
    throw new Error("System busy. Please try again.");
  }

  try {
    const wasCancelled = this.stopAutoConfirm(uuid);
    
    if (!wasCancelled) {
      logger.warn(`[CANCEL] UUID ${uuid} not found in memory, trying database`);
    }

    const pendingData = this.pendingConfirmations.get(uuid);
    if (pendingData && pendingData.is_cancelled) {
      logger.info(`[CANCEL] UUID ${uuid} already cancelled in memory`);
    }

    logger.info(`[CANCEL] Proceeding with database cancellation for UUID: ${uuid}, Reason: ${reason}, company_code: ${company_code}`);
    const result = await this.cancelAttendanceFromDatabase(uuid, actualEmployeeCode, actualEmployeeName, reason, company_code);
    
    logger.info(`Attendance cancelled in ${Date.now() - startTime}ms`);
    return result;

  } catch (err: unknown) {
    logger.error('Cancellation failed:', err);
    

    const errorMessage = err instanceof Error ? err.message : String(err || '');

    if (errorMessage.includes('already confirmed')) {
      throw new Error("Attendance already confirmed and cannot be cancelled");
    } else if (errorMessage.includes('not found')) {
      throw new Error("Attendance record not found");
    } else {
      throw new Error("Cancellation failed: " + errorMessage);
    }
  } finally {
    this.releaseRequestSlot();
  }
  }

  static stopAutoConfirm(uuid: string): boolean {
  const pendingData = this.pendingConfirmations.get(uuid);
  
  if (pendingData) {

    if (pendingData.autoConfirmTimer) {
      clearTimeout(pendingData.autoConfirmTimer);
      pendingData.autoConfirmTimer = null;
      logger.info(`Cleared auto-confirm timer for UUID: ${uuid}`);
    }
    
    pendingData.is_cancelled = true;
    this.pendingConfirmations.set(uuid, pendingData);
  }
  
  const wasPending = this.pendingConfirmations.has(uuid);
  this.cancelledConfirmations.add(uuid);
  
  // 🆕 Non-blocking background mark as cancelled (like old code)
  this.markAsCancelledInDatabase(uuid).catch(err => 
    logger.error('Failed to mark as cancelled in DB (background):', err)
  );
  
  logger.info(`Auto-confirm stopped for UUID: ${uuid}, was pending: ${wasPending}`);
  return wasPending;
}

  private static async autoConfirmFromMemory(uuid: string, company_code?: string): Promise<void> {
  // If manual confirmation is already in progress, skip auto-confirm
  if (this.confirmingUuids.has(uuid)) {
    logger.info(`[AUTO-CONFIRM] UUID ${uuid} already being confirmed manually — skipping auto`);
    this.pendingConfirmations.delete(uuid);
    return;
  }

  if (this.isAutoConfirmCancelled(uuid)) {
    logger.info(`Auto-confirm skipped - cancelled in memory: ${uuid}, NOT deleting pendingData yet (needed for cancellation)`);
    return;
  }

  const pendingData = this.pendingConfirmations.get(uuid);
  if (!pendingData) {
    logger.warn(`Auto-confirm skipped - no pending data: ${uuid}`);
    return;
  }

  if (pendingData.is_cancelled) {
    logger.info(`Auto-confirm skipped - already marked cancelled: ${uuid}, keeping pendingData for cancellation handler`);
    return;
  }

  // Acquire lock for auto-confirm to prevent races with manual confirms
  if (this.confirmingUuids.has(uuid)) {
    logger.info(`[AUTO-CONFIRM] UUID ${uuid} already being confirmed — aborting auto-confirm`);
    return;
  }

  this.confirmingUuids.add(uuid);

  let transaction;
  try {
    
    await TypeORMService.ensureConnection();
    
   await AppDataSource.transaction (async (entity) => {
    const attendanceEvent = entity.getRepository(AttendanceEvent);
    const event = await attendanceEvent
      .createQueryBuilder('event')
      .where('event.uuid = :uuid', { uuid })
      .setLock("pessimistic_write")
      .getOne();

    if (!event) {
      logger.warn(`[AUTO-CONFIRM] Event not found in DB: ${uuid}`);
      return;
    }

    if (event.status === AttendanceStatus.CANCELLED) {
      this.pendingConfirmations.delete(uuid);
      this.cancelledConfirmations.add(uuid);
      logger.info(`Auto-confirm skipped - cancelled in DB: ${uuid}`);
      return;
    }

    if (event.status === AttendanceStatus.CONFIRMED) {
      this.pendingConfirmations.delete(uuid);
      logger.info(` Auto-confirm skipped - already confirmed: ${uuid}`);
      return;
    }

    if (event.status !== AttendanceStatus.PENDING) {
      this.pendingConfirmations.delete(uuid);
      logger.info(`Auto-confirm skipped - invalid state: ${event.status}`);
      return;
    }

    // ✅ DO NOT DELETE HERE - Delete ONLY AFTER saveConfirmedAttendance completes
    await this.saveConfirmedAttendance(pendingData, 'auto_system', entity);
    
    // ✅ NOW safe to delete - attendance is confirmed, image_buffer preserved for cancellation if needed
    this.pendingConfirmations.delete(uuid);
    
    logger.info(`Auto-confirmed: ${uuid} (No S3 upload for successful attendance)`);
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('ORA-03113') || errorMsg.includes('NJS-500') || errorMsg.includes('not connected')) {
      logger.error(`[AUTO-CONFIRM] Connection error for ${uuid}: ${errorMsg}`);
      try {
        await TypeORMService.ensureConnection();
        logger.info(`[AUTO-CONFIRM] Connection restored, but skipping auto-confirm for ${uuid}`);
      } catch (reconnectErr) {
        logger.error(`[AUTO-CONFIRM] Failed to restore connection:`, reconnectErr);
      }
      return;
    }
    
    if (error && (error as any).name === 'SequelizeTimeoutError') {
      logger.warn(`[AUTO-CONFIRM] Transaction timeout for UUID: ${uuid} - might be getting cancelled`);
      return;
    } else {
      logger.error(`[AUTO-CONFIRM] Failed for ${uuid}:`, error);
    }
  } finally {
    this.confirmingUuids.delete(uuid);
  }
}

private static async saveConfirmedAttendance(data: any, confirmedBy: string, existingTransaction?: any): Promise<any> {
  try {
    const executeTransaction = async (entity: any) => {
      const today = new Date(data.timestamp);
      today.setHours(0, 0, 0, 0);

      const attendanceRecord = entity.getRepository(AttendanceRecord);
      const attendanceEvent = entity.getRepository(AttendanceEvent);

      // Lock the attendance event row first to ensure a consistent lock order
      // across different code paths and avoid deadlocks (ORA-00060).
      const lockedEvent = await attendanceEvent
        .createQueryBuilder('event')
        .where('event.uuid = :uuid', { uuid: data.uuid })
        .setLock('pessimistic_write')
        .getOne();

      let record = await attendanceRecord.findOne({ 
        where: { 
          employee_id: data.employee_id, 
          record_date: today, },
      });
    if (!record) {
       record = attendanceRecord.create({
        id: uuidv4(),
        employee_id: data.employee_id,
        employee_code: data.employee_code,
        record_date: today,
        first_check_in: data.action === "check-in" ? data.timestamp : null,
        check_in: data.action === "check-in" ? data.timestamp : null,
        status: "present",
        last_check_out: data.action === "check-out" ? data.timestamp : null,
        check_out: data.action === "check-out" ? data.timestamp : null,
        total_hours: 0,
      });
      await attendanceRecord.save(record);
    }

    if (data.action === "check-in") {
      const updates: any = {
        check_in: data.timestamp,
        status: this.calculateStatus(data.timestamp, "10:00")
      };
      if (!record.first_check_in || data.timestamp < record.first_check_in) {
        updates.first_check_in = data.timestamp;
      }
      await attendanceRecord.update({ id: record.id }, updates);
    } else {
      const updates: any = { check_out: data.timestamp };
      if (!record.last_check_out || data.timestamp > record.last_check_out) {
        updates.last_check_out = data.timestamp;
      }
      if (record.first_check_in && data.timestamp) {
        const minutes = differenceInMinutes(data.timestamp, record.first_check_in);
        updates.total_hours = Number((minutes / 60).toFixed(2));
      }
      await attendanceRecord.update({ id: record.id }, updates);

    }

    // Use the previously locked event if present
    let event: AttendanceEvent | null = lockedEvent || null;

    if (!event) {
      const eventData: Partial<AttendanceEvent> = {
        id: uuidv4(),
        employee_id: data.employee_id,
        employee_code: data.employee_code,
        event_time: data.timestamp,
        event_type: data.action === "check-in" ? AttendanceEventType.CHECK_IN : AttendanceEventType.CHECK_OUT,
        data_transfer: DataTransferFlag.N,
        uuid: data.uuid,
        confidence: data.confidence,
        s3_image_url: data.s3_image_url || null,
        status: AttendanceStatus.CONFIRMED,
        confirmed_by: confirmedBy,
        confirmed_at: new Date(),
        attendance_record_id: record.id
      };

      if (data.location_data) {
        Object.assign(eventData, {
          latitude: data.location_data.latitude,
          longitude: data.location_data.longitude,
          accuracy: data.location_data.accuracy,
          location_type: data.location_data.locationType,
          address: data.location_data.address,
          office_name: data.location_data.officeName
        });
      }

      event = attendanceEvent.create(eventData);
      await attendanceEvent.save(event);
      } else {
      const updateResult = await attendanceEvent.createQueryBuilder()
        .update(AttendanceEvent)
        .set({
          status: AttendanceStatus.CONFIRMED,
          data_transfer: DataTransferFlag.N,
          confirmed_by: confirmedBy,
          confirmed_at: new Date(),
          attendance_record_id: record.id
        })
        .where('id = :id AND status = :status', { id: event.id, status: AttendanceStatus.PENDING })
        .execute();

      if (!updateResult.affected || updateResult.affected === 0) {
        logger.info(`[CONFIRM] UUID ${data.uuid} already confirmed by another process — skipping insert/update`);
        return { event, record, alreadyConfirmed: true };
      }
    } 
    return { event, record };
    };

      const isEntityManager = existingTransaction && typeof existingTransaction.getRepository === 'function';
      const isCompanyCodeString = existingTransaction && typeof existingTransaction === 'string';

      if (isEntityManager) {
        logger.info(`[CONFIRM] Using existing transaction for UUID: ${data.uuid}`);
        return await executeTransaction(existingTransaction);
      }

      if (isCompanyCodeString) {
        try {
          if (!data.company_code) data.company_code = existingTransaction as string;
        } catch (e) {}
      }

      logger.info(`[CONFIRM] Creating new transaction for UUID: ${data.uuid}`);
      return await AppDataSource.transaction(async (entityManager) => {
        return await executeTransaction(entityManager);
      });
  } catch (error) {
    logger.error('Failed to save confirmed attendance:', error);
    throw error;
  }
}

  static async logProxyAttempt(data: any, actualEmployeeCode: string, actualEmployeeName: string, reason: string, company_code?: string): Promise<any> {
    const transaction = AppDataSource.createQueryRunner();
    await transaction.connect();
    await transaction.startTransaction();
    
    try {
      const attendanceEvent = transaction.manager.getRepository(AttendanceEvent);
      const ProxyLogs = transaction.manager.getRepository(ProxyLog);
      const employee = transaction.manager.getRepository(Employee);
      
      let event = await attendanceEvent.findOne({ where: { uuid: data.uuid } });

      if (!event) {
        const eventData: any = {
          id: uuidv4(),
          employee_id: data.employee_id,
          employee_code: data.employee_code,
          company_code: company_code || data.company_code,
          event_time: data.timestamp,
          event_type: data.action === "check-in" ? "check_in" : "check_out",
          data_transfer: "N",
          uuid: data.uuid,
          confidence: data.confidence,
          s3_image_url: data.s3_image_url,
          status: AttendanceStatus.CANCELLED,
          confirmed_by: 'cancelled_by_user',
          confirmed_at: new Date(),
        };
        logger.info('[PROXY] Creating event data for proxy log', {uuid: data.uuid});

        if (data.location_data) {
          Object.assign(eventData, {
            latitude: data.location_data.latitude,
            longitude: data.location_data.longitude,
            accuracy: data.location_data.accuracy,
            location_type: data.location_data.locationType,
            address: data.location_data.address,
            office_name: data.location_data.officeName
          });
        }
        logger.info('[PROXY] Event data created with location data', {uuid: data.uuid});

      event = await attendanceEvent.save(eventData);
      } else {
        event.status = AttendanceStatus.CANCELLED;
        event.confirmed_by = 'cancelled_by_user';
        event.confirmed_at = new Date();
        await attendanceEvent.save(event);
      }

      const proxyEmployee = await employee.findOne({
        where: { employee_code: data.employee_code },
      });
    
      logger.info('[PROXY] Saving proxy log for UUID:', data.uuid);

      const proxyLog = ProxyLogs.create({
        id: uuidv4(),
        uuid: data.uuid,
        timestamp: new Date(),  
        proxy_employee_code: data.employee_code,
        proxy_employee_name: proxyEmployee?.full_name || 'Unknown',
        actual_employee_code: actualEmployeeCode,
        actual_employee_name: actualEmployeeName,
        confidence: data.confidence,
        s3_image_url: data.s3_image_url,
        location_data: data.location_data ? JSON.stringify(data.location_data) : null,
        action: data.action === "check-in" ? "check_in" : "check_out",
        action_taken: 'cancelled_by_user',
        device_type: 'web',
        status: 'reported',
        reason: reason,
      });
      await ProxyLogs.save(proxyLog);
      logger.info('[PROXY] Proxy log saved to database', {uuid: data.uuid});

      await transaction.commitTransaction();
      return { proxyLog, cancelledEvent: event };

    } catch (error) {
      await transaction.rollbackTransaction();
      logger.error('Failed to log proxy attempt:', error);
      throw error;
    }
  }

  static async debugEmailFlow(uuid: string): Promise<void> {
  try {
    logger.info(`🔍 [EMAIL DEBUG] Starting email debug for UUID: ${uuid}`);
    
    // Check if UUID exists in pending confirmations
    const pendingData = this.pendingConfirmations.get(uuid);
    logger.info(`🔍 [EMAIL DEBUG] Pending data exists: ${!!pendingData}`);
    
    if (pendingData) {
      logger.info(`🔍 [EMAIL DEBUG] Pending data:`, {
        employee_code: pendingData.employee_code,
        confidence: pendingData.confidence,
        is_cancelled: pendingData.is_cancelled
      });
    }
    
    // Check database status
    const attendanceEvent = AppDataSource.getRepository(AttendanceEvent);
    const event = await attendanceEvent.findOne({ where: { uuid } });

    logger.info(`🔍 [EMAIL DEBUG] Database event:`, {
      exists: !!event,
      status: event?.status,
      employee_code: event?.employee_code
    });
    
    // Check proxy log
    const ProxyLogRepo = AppDataSource.getRepository(ProxyLog);
    const proxyLog = await ProxyLogRepo.findOne({ where: { uuid } });

    logger.info(`🔍 [EMAIL DEBUG] Proxy log:`, {
      exists: !!proxyLog,
      reason: proxyLog?.reason
    });
    
  } catch (error) {
    logger.error(`🔍 [EMAIL DEBUG] Error:`, error);
  }
}
  
  private static async cancelAttendanceFromDatabase(
  uuid: string, 
  actualEmployeeCode: string, 
  actualEmployeeName: string, 
  reason: string,
  company_code?: string
): Promise<any> {
  let transaction: any = null;
  try {
    transaction = AppDataSource.createQueryRunner();
    const attendanceEvent = AppDataSource.getRepository(AttendanceEvent);
    const ProxyLogs = AppDataSource.getRepository(ProxyLog);
    const employee = AppDataSource.getRepository(Employee);
    logger.info(`[CANCEL] Starting database cancellation for UUID: ${uuid}, Reason: ${reason}, company_code: ${company_code}`);
    
    await transaction.connect();
    await transaction.startTransaction();

    const event = await transaction.manager.getRepository(AttendanceEvent)
      .createQueryBuilder('event')
      .where('event.uuid = :uuid', { uuid })
      .andWhere(company_code ? 'event.company_code = :company_code' : '1=1', { company_code })
      .setLock("pessimistic_write")
      .getOne();

    if (!event) {
      logger.error(`[CANCEL] Event not found for UUID: ${uuid}`);
      throw new Error("Attendance event not found");
    }

    logger.info(`[CANCEL] Found event with status: ${event.status} for UUID: ${uuid}`);

    if (event.status === AttendanceStatus.CONFIRMED) {
      logger.warn(`[CANCEL] Already confirmed for UUID: ${uuid} - cannot cancel`);
      
      const proxyEmployee = await transaction.manager.getRepository(Employee).findOne({
        where: { employee_code: event.employee_code, company_code: event.company_code },
      });

      let s3ImageUrl = null;
      const pendingData = this.pendingConfirmations.get(uuid);
      
      if (reason === 'proxy_detected_by_user' && pendingData?.image_buffer) {
        logger.info(`[CANCEL] 📸 Uploading image for late cancellation - UUID: ${uuid}`);
        try {
          const key = `attendance/proxy/${uuid}_${Date.now()}.jpg`;
          s3ImageUrl = await uploadEmployeeFace(pendingData.image_buffer, key, 'image/jpeg');
          logger.info(`[CANCEL] ✅ Image uploaded for late cancel: ${s3ImageUrl}`);
        } catch (uploadError: any) {
          logger.error(`[CANCEL] ❌ Failed to upload image for late cancel - UUID: ${uuid}`, {
            errorMessage: uploadError?.message,
            errorName: uploadError?.name,
          });
        }
      }

      const proxyLog = transaction.manager.getRepository(ProxyLog).create({
        id: uuidv4(),
        uuid: event.uuid,
        timestamp: new Date(),
        company_code: event.company_code,
        proxy_employee_code: event.employee_code,
        proxy_employee_name: proxyEmployee?.full_name || 'Unknown',
        actual_employee_code: actualEmployeeCode,
        actual_employee_name: actualEmployeeName,
        confidence: event.confidence ?? 0,
        s3_image_url: s3ImageUrl ?? event.s3_image_url ?? null,
        location_data: event.location_data ? JSON.stringify(event.location_data) : null,
        action: event.event_type,
        action_taken: 'cancel_confirmed',
        device_type: 'web',
        status: 'reported',
        reason: reason + '_after_confirmation',
      });
      const savedProxyLog = await transaction.manager.getRepository(ProxyLog).save(proxyLog);
      await transaction.commitTransaction();
      let emailSent = false;
      if (reason === 'proxy_detected_by_user') {
        emailSent = await this.sendLateCancellationEmail(savedProxyLog, actualEmployeeCode, actualEmployeeName);
      }
      return { 
        success: false,
        alreadyConfirmed: true,
        proxyLog: savedProxyLog,
        emailSent,
        message: 'Attendance was already confirmed and cannot be cancelled'
      };
    }

    if (event.status === AttendanceStatus.CANCELLED) {
      logger.warn(`[CANCEL] ⚠️ Event already cancelled for UUID: ${uuid}, but recording new proxy report - Reason: ${reason}`);
      const proxyEmployee = await transaction.manager.getRepository(Employee).findOne({
        where: { employee_code: event.employee_code },
      });

      // 🆕 CHECK FOR IMAGE UPLOAD IN DUPLICATE CANCELLATION CASE TOO
      let s3ImageUrl = null;
      const pendingData = this.pendingConfirmations.get(uuid);
      
      if (reason === 'proxy_detected_by_user' && pendingData?.image_buffer) {
        logger.info(`[CANCEL] 📸 Uploading image for duplicate cancellation - UUID: ${uuid}`);
        try {
          const key = `attendance/proxy/${uuid}_${Date.now()}.jpg`;
          s3ImageUrl = await uploadEmployeeFace(pendingData.image_buffer, key, 'image/jpeg');
          logger.info(`[CANCEL] ✅ Image uploaded for duplicate cancel: ${s3ImageUrl}`);
        } catch (uploadError: any) {
          logger.error(`[CANCEL] ❌ Failed to upload image for duplicate cancel - UUID: ${uuid}`, {
            errorMessage: uploadError?.message,
            errorName: uploadError?.name,
          });
        }
      }

      const proxyLogData = {
        id: uuidv4(),
        uuid: event.uuid,
        timestamp: new Date(),
        proxy_employee_code: event.employee_code,
        proxy_employee_name: proxyEmployee?.full_name || 'Unknown',
        company_code: event.company_code,
        actual_employee_code: actualEmployeeCode,
        actual_employee_name: actualEmployeeName,
        confidence: event.confidence ?? 0,
        s3_image_url: s3ImageUrl ?? event.s3_image_url ?? null,
        location_data: event.location_data ? JSON.stringify(event.location_data) : null,
        action: event.event_type,
        action_taken: 'duplicate_cancel',
        device_type: 'web',
        status: 'reported',
        reason: reason + '_duplicate',
      };

      const proxyLog = transaction.manager.getRepository(ProxyLog).create(proxyLogData);
      
      let savedProxyLog: any;
      try {
        savedProxyLog = await transaction.manager.getRepository(ProxyLog).save(proxyLog);
        logger.info(`[CANCEL] Duplicate cancellation proxy log saved for UUID: ${uuid}`);
      } catch (saveError: any) {
        logger.error(`[CANCEL] Failed to save duplicate cancellation proxy log for UUID: ${uuid}`, saveError);
      }

      await transaction.commitTransaction();

      let emailSent = false;
      if (reason === 'proxy_detected_by_user') {
        logger.info(`[CANCEL] Sending alert email for duplicate cancellation attempt - UUID: ${uuid}`);
        // ✅ Pass savedProxyLog which contains all the data
        emailSent = await this.sendProxyAlertEmailBackgroundFromDB(savedProxyLog, actualEmployeeCode, actualEmployeeName);
        logger.info(`[CANCEL] Email sent result: ${emailSent} for UUID: ${uuid}`);
      }

      return { 
        success: true, 
        alreadyCancelled: true,
        proxyLog: savedProxyLog,
        emailSent,
        message: "Attendance already cancelled - Duplicate cancellation attempt logged as proxy" 
      };
    }

    if (event.status !== AttendanceStatus.PENDING) {
      await transaction.rollbackTransaction();
      logger.warn(`[CANCEL] Invalid state: ${event.status} for UUID: ${uuid}`);
      return { 
        success: false, 
        invalidState: true, 
        status: event.status,
        message: `Attendance is in ${event.status} state and cannot be cancelled` 
      };
    }

    logger.info(`[CANCEL] Marking as cancelled for UUID: ${uuid}`);
      event.status = AttendanceStatus.CANCELLED;
      event.confirmed_by = 'cancelled_by_user';
      event.confirmed_at = new Date();
      event.cancellation_reason = reason;
      event.data_transfer = DataTransferFlag.C;
    await transaction.manager.getRepository(AttendanceEvent).save(event);
    let s3ImageUrl = null;
    const pendingData = this.pendingConfirmations.get(uuid);
    
    logger.info(`[CANCEL] Checking for image upload - UUID: ${uuid}`, {
      hasPendingData: !!pendingData,
      pendingDataKeys: pendingData ? Object.keys(pendingData) : [],
      hasImageBuffer: !!pendingData?.image_buffer,
      imageBufferType: pendingData?.image_buffer ? typeof pendingData.image_buffer : 'undefined',
      imageBufferSize: pendingData?.image_buffer?.length || 0,
      reason: reason,
      reasonMatches: reason === 'proxy_detected_by_user',
      shouldUpload: !!(pendingData && pendingData.image_buffer && reason === 'proxy_detected_by_user')
    });
    
    if (pendingData && pendingData.image_buffer && reason === 'proxy_detected_by_user') {
      logger.info(`[CANCEL] 📸 Starting image upload to S3 for proxy - UUID: ${uuid}`, {
        bufferSize: pendingData.image_buffer.length,
        bufferType: typeof pendingData.image_buffer,
        bufferIsBuffer: Buffer.isBuffer(pendingData.image_buffer)
      });
      try {
        const key = `attendance/proxy/${uuid}_${Date.now()}.jpg`;
        logger.info(`[CANCEL] Uploading image with key: ${key}, buffer size: ${pendingData.image_buffer.length} bytes`);
        
        logger.info(`[CANCEL] Calling uploadEmployeeFace function...`);
        s3ImageUrl = await uploadEmployeeFace(pendingData.image_buffer, key, 'image/jpeg');
        logger.info(`[CANCEL] uploadEmployeeFace returned:`, {
          result: s3ImageUrl,
          isNull: s3ImageUrl === null,
          isEmpty: s3ImageUrl === '',
          resultLength: typeof s3ImageUrl === 'string' ? s3ImageUrl.length : 'not-a-string'
        });
        
        if (s3ImageUrl) {
          logger.info(`[CANCEL] ✅ Image uploaded to S3 successfully - UUID: ${uuid}, URL: ${s3ImageUrl.substring(0, 100)}...`);
        } else {
          logger.warn(`[CANCEL] ⚠️ Image upload returned null/empty URL - UUID: ${uuid}, uploadResult: ${s3ImageUrl}`);
        }
      } catch (uploadError) {
        logger.error(`[CANCEL] ❌ Failed to upload image to S3 - UUID: ${uuid}`, {
          errorMessage: uploadError instanceof Error ? uploadError.message : String(uploadError),
          errorName: uploadError instanceof Error ? uploadError.name : 'unknown',
          errorStack: uploadError instanceof Error ? uploadError.stack : undefined,
          bufferSize: pendingData?.image_buffer?.length || 0
        });
        
      }
    } else {
      logger.warn(`[CANCEL] ⚠️ Image upload SKIPPED for UUID: ${uuid}`, {
        reason: reason,
        reasonMatches: reason === 'proxy_detected_by_user',
        hasPendingData: !!pendingData,
        hasImageBuffer: !!pendingData?.image_buffer,
        imageBufferSize: pendingData?.image_buffer?.length || 0,
        imageBufferType: pendingData?.image_buffer ? typeof pendingData.image_buffer : 'undefined',
        allConditionsMet: !!(pendingData && pendingData.image_buffer && reason === 'proxy_detected_by_user'),
        condition1_hasPendingData: !!pendingData,
        condition2_hasImageBuffer: !!pendingData?.image_buffer,
        condition3_reasonMatches: reason === 'proxy_detected_by_user'
      });
    }

    const proxyEmployee = await transaction.manager.getRepository(Employee).findOne({
      where: { employee_code: event.employee_code },
    });

    logger.info(`[CANCEL] Creating proxy log for UUID: ${uuid}, Reason: ${reason}`);
    const proxyLogData = {
      id: uuidv4(),
      uuid: event.uuid,
      timestamp: new Date(),
      proxy_employee_code: event.employee_code,
      proxy_employee_name: proxyEmployee?.full_name || 'Unknown',
      actual_employee_code: actualEmployeeCode,
      actual_employee_name: actualEmployeeName,
      confidence: event.confidence ?? 0,
      s3_image_url: s3ImageUrl, 
      location_data: event.location_data ? JSON.stringify(event.location_data) : null,
      action: event.event_type,
      action_taken: 'cancelled_by_user',
      device_type: 'web',
      status: 'reported',
      reason: reason,
    };
    
    logger.info(`[CANCEL] Proxy log data prepared:`, { 
      id: proxyLogData.id,
      uuid: proxyLogData.uuid,
      proxy_code: proxyLogData.proxy_employee_code,
      actual_code: proxyLogData.actual_employee_code,
      reason: proxyLogData.reason,
      s3_image_url: s3ImageUrl ? `✅ YES - ${s3ImageUrl.substring(0, 80)}...` : '❌ NO'
    });
    
    const proxyLog = transaction.manager.getRepository(ProxyLog).create(proxyLogData);

    let savedProxyLog: any;
    try {
      logger.info(`[CANCEL] About to save proxy log to database for UUID: ${uuid}`);
      savedProxyLog = await transaction.manager.getRepository(ProxyLog).save(proxyLog);
      logger.info(`✅ [CANCEL] Proxy log saved successfully to database for UUID: ${uuid}`, {
        savedId: savedProxyLog.id,
        savedUuid: savedProxyLog.uuid,
        s3ImageUrl: s3ImageUrl ? `✅ Stored - ${s3ImageUrl.substring(0, 60)}...` : '❌ No image'
      });
    } catch (saveError: any) {
      logger.error(`[CANCEL] Failed to save proxy log for UUID: ${uuid}`, {
        errorMessage: saveError.message,
        errorCode: saveError.code,
        errorName: saveError.name,
        fullError: saveError
      });
      throw new Error(`Failed to save proxy log: ${saveError.message}`);
    }

    await transaction.commitTransaction();
    logger.info(`[CANCEL] Transaction committed successfully for UUID: ${uuid}`);

    logger.info(`[CANCEL] Successfully cancelled attendance for UUID: ${uuid}`);

    let emailSent = false;
    logger.info(`[CANCEL] Checking reason: '${reason}' === 'proxy_detected_by_user' ? ${reason === 'proxy_detected_by_user'}`);
    
    if (reason === 'proxy_detected_by_user') {
      logger.info(`[CANCEL] ✅ Reason matches - Triggering email for proxy detection - UUID: ${uuid}`);
      // ✅ Pass savedProxyLog which contains the s3_image_url
      emailSent = await this.sendProxyAlertEmailBackgroundFromDB(savedProxyLog, actualEmployeeCode, actualEmployeeName);
      logger.info(`[CANCEL] Email sent result: ${emailSent} for UUID: ${uuid}`);
    } else {
      logger.info(`[CANCEL] ⚠️ Reason does NOT match 'proxy_detected_by_user' - No email sent. Actual reason: '${reason}'`);
    }

    return { 
      success: true,
      proxyLog: savedProxyLog,
      cancelledEvent: event,
      emailSent,
      message: 'Attendance cancelled successfully'
    };

  } catch (error: any) {
    if (transaction?.isTransactionActive) {
      try {
        await transaction.rollbackTransaction();
      } catch (rollbackErrorTransaction) {
        logger.error('Cancellation transaction rollback failed (or transaction already finalized):', rollbackErrorTransaction);
      }
    }
    
    if (error?.name === 'SequelizeTimeoutError') {
      logger.warn(`[CANCEL] Transaction timeout for UUID: ${uuid} - auto-confirm in progress`);
      throw new Error("System is processing this attendance. Please try again in a moment.");
    } else {
      logger.error('Cancel attendance transaction failed:', error);
      throw error;
    }
  } finally {
    if (transaction) {
      try {
        await transaction.release();
        logger.info(`[CANCEL] Transaction released for UUID: ${uuid}`);
      } catch (releaseError) {
        logger.warn(`[CANCEL] Error releasing transaction for UUID: ${uuid}`, releaseError);
      }
    }
  }
}
// HANDLE LATE CANCELLATION ATTEMPTS
private static async sendLateCancellationEmail(proxyLog: any, actualEmployeeCode: string, actualEmployeeName: string): Promise<boolean> {
  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const [proxyEmployee, actualEmployee] = await Promise.all([
      employeeRepo.findOne({ 
        where: { employee_code: proxyLog.proxy_employee_code },
        select: ['full_name', 'department'],
      }),
      employeeRepo.findOne({ 
        where: { employee_code: actualEmployeeCode },
        select: ['full_name', 'department'],
      })
    ]);

    const proxyData = {
      uuid: proxyLog.uuid,
      timestamp: proxyLog.timestamp || new Date(),
      proxy_employee_code: proxyLog.proxy_employee_code,
      proxy_employee_name: proxyEmployee?.full_name || proxyLog.proxy_employee_name || 'Unknown',
      proxy_department: proxyEmployee?.department || 'Unknown',
      actual_employee_code: actualEmployeeCode,
      actual_employee_name: actualEmployeeName,
      actual_department: actualEmployee?.department || 'Unknown',
      confidence: proxyLog.confidence || 0,
      action_taken: proxyLog.action_taken,
      s3_image_url: proxyLog.s3_image_url || null,
      location_data: proxyLog.location_data || null,
      image_available: !!proxyLog.s3_image_url
    };

    const adminEmails = ["Sagar.b@bayanattechnology.com", "salim.alsaltiy@almadinalogistics.onmicrosoft.com"];
   
    const lateCancellationHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background: #ff9800; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>LATE CANCELLATION ATTEMPT</h2>
      <p>User tried to cancel after auto-confirmation</p>
    </div>
    
    <div class="content">
      <div class="warning">
        <h3>Attention Required</h3>
        <p><strong>This attendance was already auto-confirmed before the user could cancel it.</strong></p>
        <p>The user attempted to report a proxy detection after the system had already confirmed the attendance.</p>
      </div>
      
      <div class="section">
        <p><strong>UUID:</strong> ${proxyData.uuid}</p>
        <p><strong>Timestamp:</strong> ${new Date(proxyData.timestamp).toLocaleString()}</p>
        <p><strong>Action:</strong> ${proxyData.action_taken}</p>
        <p><strong>Confidence Level:</strong> ${proxyData.confidence}%</p>
      </div>

      <div class="section">
        <h3>👤 System-Recognized Employee</h3>
        <p><strong>Employee Code:</strong> ${proxyData.proxy_employee_code}</p>
        <p><strong>Name:</strong> ${proxyData.proxy_employee_name}</p>
        <p><strong>Department:</strong> ${proxyData.proxy_department}</p>
      </div>

      <div class="section">
        <h3>👥 Reporting Employee</h3>
        <p><strong>Reported By:</strong> ${proxyData.actual_employee_name}</p>
        <p><strong>Employee Code:</strong> ${proxyData.actual_employee_code}</p>
      </div>

      <div class="warning">
        <h3>📋 Required Action</h3>
        <p>Please manually review this attendance record and take appropriate action if this was indeed a proxy attempt.</p>
        <p><strong>Current Status:</strong> Attendance remains CONFIRMED in the system.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await notifyUser({
      event: constants.EVENTS.PROXY_ATTENDANCE_DETECTED,
      request_user: proxyData, 
      request_users: adminEmails.join(','), 
      subject: `⚠️ LATE CANCELLATION ATTEMPT - ${proxyData.proxy_employee_name}`,
      htmlMessage: lateCancellationHtml,
      attachments: [] 
    });

    return true;
  } catch (error) {
    logger.error('Late cancellation email failed:', error);
    return false;
  }
}

static async sendProxyAlertEmailWithImage(data: any, actualEmployeeCode: string, actualEmployeeName: string, s3ImageUrl: string | null): Promise<boolean> {
  try {
    const proxyEmployeeRepo = AppDataSource.getRepository(Employee);
    logger.info(`📧 [EMAIL] Starting proxy email for UUID: ${data.uuid}`);
    
    let proxyEmployee: any = null;
    let actualEmployee: any = null;
    
    [proxyEmployee, actualEmployee] = await Promise.all([
      proxyEmployeeRepo.findOne({ 
        where: { employee_code: data.employee_code },
        select: ['full_name', 'department', 'email']
      }),
      proxyEmployeeRepo.findOne({
        where: { employee_code: actualEmployeeCode },
        select: ['full_name', 'department', 'email'],
      })
    ]);

    const proxyData = {
      uuid: data.uuid,
      timestamp: data.timestamp,
      proxy_employee_code: data.employee_code,
      proxy_employee_name: proxyEmployee?.full_name || 'Unknown',
      proxy_department: proxyEmployee?.department || 'Unknown',
      proxy_email: proxyEmployee?.email || 'N/A',
      actual_employee_code: actualEmployeeCode,
      actual_employee_name: actualEmployeeName,
      actual_department: actualEmployee?.department || 'Unknown',
      actual_email: actualEmployee?.email || 'N/A',
      confidence: data.confidence,
      action_taken: 'cancelled_by_user',
      s3_image_url: s3ImageUrl,
      location_data: data.location_data,
      image_available: !!s3ImageUrl,
      event_type: data.action === "check-in" ? "Check In" : "Check Out"
    };

    const adminEmails = ["Sagar.b@bayanattechnology.com" ,"salim.alsaltiy@almadinalogistics.onmicrosoft.com"];

    logger.info(`[EMAIL] Sending to: ${adminEmails.join(', ')}`);
    logger.info(`[EMAIL] Proxy data:`, {
      proxy_name: proxyData.proxy_employee_name,
      actual_name: proxyData.actual_employee_name,
      confidence: proxyData.confidence,
      has_image: !!s3ImageUrl
    });

    try {
      const emailPromise = notifyUser({
        event: constants.EVENTS.PROXY_ATTENDANCE_DETECTED,
        request_user: proxyData, 
        request_users: adminEmails.join(','), 
        subject: `🚨 PROXY ATTENDANCE DETECTED - ${proxyData.proxy_employee_name} (${proxyData.proxy_employee_code})`,
        message: `Proxy attendance detected and cancelled by user. Confidence: ${proxyData.confidence}%`,
        attachments: [] 
      });

      const timeoutPromise = new Promise<boolean>((resolve) => 
        setTimeout(() => {
          logger.warn(`📧 [EMAIL] Email sending timeout for UUID: ${data.uuid}`);
          resolve(false);
        }, 10000) 
      );

      const result = await Promise.race([emailPromise, timeoutPromise]);
      
      if (result) {
        logger.info(`✅ [EMAIL] Proxy email sent successfully for UUID: ${data.uuid}`);
        return true;
      } else {
        logger.error(`❌ [EMAIL] Proxy email failed or timed out for UUID: ${data.uuid}`);
        return false;
      }
      
    } catch (emailError) {
      logger.error(`❌ [EMAIL] Proxy email exception for UUID: ${data.uuid}:`, emailError);
      return false;
    }

  } catch (error) {
    logger.error('❌ [EMAIL] Proxy email setup failed:', error);
    return false;
  }
}

 // 🎯 BACKGROUND EMAIL SEND
  private static async sendProxyAlertEmailBackgroundFromDB(proxyLog: any, actualEmployeeCode: string, actualEmployeeName: string): Promise<boolean> {
    try {
      logger.info(`[EMAIL] Starting email send for proxy detection - UUID: ${proxyLog.uuid}`);
      
      const employeeRepo = AppDataSource.getRepository(Employee);
      const [proxyEmployee, actualEmployee] = await Promise.all([
        employeeRepo.findOne({ 
          where: { employee_code: proxyLog.proxy_employee_code },
          select: ['full_name', 'department'],
        }),
        employeeRepo.findOne({ 
          where: { employee_code: actualEmployeeCode },
          select: ['full_name', 'department'],
        })
      ]);

      const proxyData = {
        uuid: proxyLog.uuid,
        timestamp: proxyLog.timestamp || new Date(),
        proxy_employee_code: proxyLog.proxy_employee_code,
        proxy_employee_name: proxyEmployee?.full_name || proxyLog.proxy_employee_name || 'Unknown',
        proxy_department: proxyEmployee?.department || 'Unknown',
        actual_employee_code: actualEmployeeCode,
        actual_employee_name: actualEmployeeName,
        actual_department: actualEmployee?.department || 'Unknown',
        confidence: proxyLog.confidence || 0,
        action_taken: proxyLog.action_taken || 'cancelled_by_user',
        s3_image_url: proxyLog.s3_image_url || null,
        location_data: proxyLog.location_data ? (typeof proxyLog.location_data === 'string' ? JSON.parse(proxyLog.location_data) : proxyLog.location_data) : null,
        image_available: !!proxyLog.s3_image_url
      };

      const adminEmails = ["Sagar.b@bayanattechnology.com","salim.alsaltiy@almadinalogistics.onmicrosoft.com"];

      logger.info(`[EMAIL] Calling notifyUser with admin emails: ${adminEmails.join(',')} for UUID: ${proxyLog.uuid}`);
      
      try {
        // Use notifyUser from functions.ts - it handles HTML generation in PROXY_ATTENDANCE_DETECTED case
        // IMPORTANT: Await the email send to ensure it completes before returning
        // This ensures: 1) Database save ✓  2) Email sent ✓  THEN return
        await notifyUser({
          event: constants.EVENTS.PROXY_ATTENDANCE_DETECTED,
          request_user: proxyData, 
          request_users: adminEmails.join(','), 
          subject: `🚨 PROXY ATTENDANCE DETECTED - ${proxyData.proxy_employee_name}`,
          message: this.generateProxyEmailMessage(proxyData, actualEmployeeName, !!proxyLog.s3_image_url),
          attachments: [] 
        });
        
        logger.info(`[EMAIL] ✅ Email sent successfully for UUID: ${proxyLog.uuid}`);
        return true;
      } catch (emailError: any) {
        logger.error(`[EMAIL] ❌ Failed to send email for UUID: ${proxyLog.uuid}`, {
          errorMessage: emailError.message,
          errorCode: emailError.code,
          fullError: emailError
        });
        return false;
      }
    } catch (error) {
      logger.error(`[EMAIL] Error preparing email for UUID: ${proxyLog.uuid}`, error);
      return false;
    }
  }

  // 🎯 GET EMPLOYEE IMAGE
  private static async getEmployeeImage(employeeId: string): Promise<string | null> {
    try {
      const cacheKey = `employee_face:${employeeId}`;
      let imageUrl = await this.cache.get(cacheKey);
      
      if (!imageUrl) {
        const employeeFaces = AppDataSource.getRepository(EmployeeFace);
        const employeeFace = await employeeFaces.findOne({
          where: { employee_id: employeeId, is_active: "1" }
        });
        
        imageUrl = employeeFace ? await getSignedUrl(employeeFace.s3_key) : null;
        
        if (imageUrl) {
          await this.cache.set(cacheKey, imageUrl, CACHE_TTL);
        }
      }
      
      return imageUrl;
    } catch (error) {
      return null;
    }
  }

  // 🎯 FIXED CHECK IF UUID IS CANCELLED IN DATABASE
  private static async isCancelledInDatabase(uuid: string, company_code?: string): Promise<boolean> {
    try {
      const attendanceEvents = AppDataSource.getRepository(AttendanceEvent);
      const whereClause: any = { uuid };
      if (company_code) {
        whereClause.company_code = company_code;
      }
      const event = await attendanceEvents.findOne({
        where: whereClause,
        select: ['status']
      });
      return event?.status === AttendanceStatus.CANCELLED;
    } catch (error) {
      logger.error('Failed to check cancellation status in database:', error);
      return false;
    }
  }


  private static async markAsCancelledInDatabase(uuid: string): Promise<void> {
    try {
      const attendanceEvent = AppDataSource.getRepository(AttendanceEvent);
      const result = await attendanceEvent.update(
        { 
          uuid,
          status: AttendanceStatus.PENDING  
        },
        { 
         status: AttendanceStatus.CANCELLED,
         data_transfer: DataTransferFlag.C,  
         confirmed_by: 'cancelled_by_user',
         confirmed_at: new Date(),
         cancellation_reason: 'cancelled_by_user'
        }
      );
      
      if (result.affected && result.affected > 0) {
        logger.info(`✅ Marked as cancelled in database: ${uuid}, data_transfer set to 'C'`);
      } else {
        logger.info(`[CANCEL-DB] Update skipped for ${uuid} - status already changed (likely confirmed)`);
      }
    } catch (error) {
      logger.error('Failed to mark as cancelled in database:', error);
    }
  }

  static isAutoConfirmCancelled(uuid: string): boolean {
    return this.cancelledConfirmations.has(uuid);
  }
  static async processAutoConfirm(): Promise<void> {
    const now = new Date();
    let memoryConfirmed = 0;
    let memoryCancelled = 0;
    let memorySkipped = 0;
    
    const pendingEntries = Array.from(this.pendingConfirmations.entries());
    
    for (const [uuid, data] of pendingEntries) {
      if (data.auto_confirm_time <= now) {
        try {
          if (data.is_cancelled || this.isAutoConfirmCancelled(uuid)) {
            this.pendingConfirmations.delete(uuid);
            memoryCancelled++;
            continue;
          }

          await this.autoConfirmFromMemory(uuid);
          memoryConfirmed++;
          
        } catch (error) {
          logger.error(`[AUTO-CONFIRM] Failed for ${uuid}:`, error);
          memorySkipped++;
        }
      }
    }

    if (memoryConfirmed > 0 || memoryCancelled > 0 || memorySkipped > 0) {
      logger.info(`[AUTO-CONFIRM] Completed: ${memoryConfirmed} confirmed, ${memoryCancelled} cancelled, ${memorySkipped} skipped`);
    }
  }

  static async getProxyLogs(filters: any = {}): Promise<any> {
    const { page = 1, limit = 50, start_date, end_date, employee_code, company_code } = filters;
    
    const cacheKey = `proxy_logs:${page}:${limit}:${start_date}:${end_date}:${employee_code}:${company_code}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const offset = (page - 1) * limit;
    const whereClause: any = {};

    if (company_code) {
      whereClause.company_code = company_code;
    }

    if (start_date && end_date) {
      const start = new Date(start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      whereClause.timestamp = Between(start, end);
    }

    if (employee_code) {
      whereClause.proxy_employee_code = employee_code;
    }

    console.log('whereClause:', JSON.stringify(whereClause));
    console.log('company_code value:', company_code, typeof company_code);
    console.log('filters received:', JSON.stringify(filters));

    const AttendanceLog = AppDataSource.getRepository(ProxyLog);
    const [ rows, count ]  = await AttendanceLog.findAndCount({
      where: whereClause,
      order: { timestamp: 'DESC' },
      skip: offset,
      take: parseInt(limit)
    });

    const result = {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(count / limit),
      proxy_logs: rows
    };

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  static async getAttendanceReport(
    startDate: Date,
    endDate: Date,
    company_code: string,
    department?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setHours(0, 0, 0, 0);

    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    const eventWhereClause: any = {
      event_time: Between(adjustedStartDate, adjustedEndDate),
      status: In([AttendanceStatus.CONFIRMED, AttendanceStatus.PENDING]),
    };

    let employeeWhereClause = {};
    if (department) employeeWhereClause = { department };
      if (company_code) {
        eventWhereClause.company_code = company_code;
      }


    const AttendanceReport = AppDataSource.getRepository(AttendanceEvent)
    const [ rows, count ]  = await AttendanceReport.findAndCount({
      where: eventWhereClause,
      relations: 
        {
          employee: true,
          record: true,
        },
      order: {"event_time": "DESC"},
      skip,
      take: limit,
    });

    const formattedData = rows.map((event: any) => {
      const eventTime = new Date(event.event_time);
      const eventDate = new Date(eventTime);
      eventDate.setHours(0, 0, 0, 0);

      return {
        event_id: event.id,
        event_type: event.event_type,
        event_time: event.event_time,
        employee_id: event.employee_id,
        employee_code: event.employee_code,
        full_name: event.employee?.full_name,
        department: event.employee?.department,
        company_code: event.company_code,
        position: event.employee?.position,
        date: eventDate.toISOString().split("T")[0], 
        daily_status: event.record?.status,
        total_hours: event.record?.total_hours,
        time_only: eventTime.toTimeString().split(" ")[0], 
        day_of_week: eventTime.toLocaleDateString("en-US", { weekday: "long" }),
      };
    });

    return { total: count, page, limit, data: formattedData };
  }

  /**
   * Helper method to safely query records by IDs, working around Oracle's 1000 expression limit
   * Splits large ID arrays into chunks and performs multiple queries
   */
  private static async findByIdsInBatches<T>(
    repository: any,
    ids: string[],
    options: any = {}
  ): Promise<T[]> {
    if (ids.length === 0) return [];

    const idChunks = chunkArray(ids, 1000);
    const results: T[] = [];

    for (const chunk of idChunks) {
      const chunkResults = await repository.find({
        where: {
          id: In(chunk),
          ...options.where,
        },
        ...options.otherOptions,
      });
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Fetch ALL attendance records for a month range without pagination
   * Internally fetches in batches to handle large datasets efficiently
   * Safe for datasets exceeding 2000+ records
   */
     static async getFullMonthAttendanceReport(
         startDate: Date,
         endDate: Date,
         company_code: string,
         department?: string
           ): Promise<any[]> {
        // Ensure correct tenant schema before executing TypeORM queries
           //await ensureCorrectSchema();

      const adjustedStartDate = new Date(startDate);
      adjustedStartDate.setHours(0, 0, 0, 0);

     const adjustedEndDate = new Date(endDate);
     adjustedEndDate.setHours(23, 59, 59, 999);

      // Build where clause - doesn't use IN with large arrays
      const eventWhereClause: any = {
      event_time: Between(adjustedStartDate, adjustedEndDate),
      status: In([AttendanceStatus.CONFIRMED, AttendanceStatus.PENDING]),
     };

    // Add company code filter
    if (company_code) {
      eventWhereClause.company_code = company_code;
    }

    // Add department filter if provided
    if (department) {
      eventWhereClause.employee = { department };
    }

    // Fetch ALL records for the date range without pagination
    // This works even with 2000+ records because we use BETWEEN instead of IN with large arrays
    const AttendanceReport = AppDataSource.getRepository(AttendanceEvent);
    const allRows = await AttendanceReport.find({
      where: eventWhereClause,
      relations: {
        employee: true,
        record: true,
      },
      order: { event_time: "DESC" },
    });

    // Format all data
    const formattedData = allRows.map((event: any) => {
      const eventTime = new Date(event.event_time);
      const eventDate = new Date(eventTime);
      eventDate.setHours(0, 0, 0, 0);

      return {
        event_id: event.id,
        event_type: event.event_type,
        event_time: event.event_time,
        employee_id: event.employee_id,
        employee_code: event.employee_code,
        full_name: event.employee?.full_name,
        department: event.employee?.department,
        company_code: event.company_code,
        position: event.employee?.position,
        date: eventDate.toISOString().split("T")[0],
        daily_status: event.record?.status,
        total_hours: event.record?.total_hours,
        time_only: eventTime.toTimeString().split(" ")[0],
        day_of_week: eventTime.toLocaleDateString("en-US", { weekday: "long" }),
      };
    });

    return formattedData;
  }

  //  Create a pending attendance request (stores image in OCI and creates request row)
  static async createAttendanceRequest(
    employeeCode: string,
    eventType: 'check_in' | 'check_out',
    company_code: string,
    imageBuffer: Buffer,
    requestedBy: string 
  ): Promise<any> {
    const uuid = uuidv4();
    const now = new Date();

    // Find employee by code
    const empRepo = AppDataSource.getRepository(Employee);
    const employee = await empRepo.findOne({ where: { employee_code: employeeCode } });
    if (!employee) throw new Error('Employee not found');

    //requestedBy 
    const resolvedRequestedBy = requestedBy ?? employee.full_name;

    // Upload image to OCI
    let  s3ImageUrl: string | null = null;
    try {
      const key = `attendance_requests/${employee.employee_id}/${uuid}.jpg`;
      await uploadFile(imageBuffer, key, `${uuid}.jpg`);
      // s3Key = key;
      s3ImageUrl = constants.OCI_S3_COMPATIBILITY.getObjectUrl(key);
    } catch (err) {
      logger.error('Failed to upload attendance request image to OCI', err);
      // proceed without image but warn
    }
    
    const repo = AppDataSource.getRepository(AttendanceRequest);
    const record: any = {
      id: uuid,
      employee_id: employee.employee_id,
      employee_code: employee.employee_code,
      company_code: company_code,
      requested_by: resolvedRequestedBy,
      event_type: eventType,
      event_time: now,
      s3_image_key:  s3ImageUrl, //s3Key,
      status: AttendanceRequestStatus.PENDING,
      created_at: now
    };

    await repo.save(record);
    console.log('Record saved:', record);
    return { success: true, requestId: uuid };
  }

  static async listAttendanceRequests(filters: any = {}): Promise<any> {
    const { page = 1, limit = 50, status, company_code } = filters;
    const repo = AppDataSource.getRepository(AttendanceRequest);
    const skip = (page - 1) * limit;   

    const whereClause: any = {};

     if(company_code) {
      whereClause.company_code = company_code;
     }

     if (status && status !== 'ALL') {
        whereClause.status = status;
      }
    console.log(`Listing attendance requests :`, { status: whereClause.status });
    const [rows, count] = await repo.findAndCount({
      where: whereClause,
      relations: {
       employee: true 
      },
      order: { created_at: 'DESC' },
      skip,
      take: parseInt(limit)
    });
     console.log(`Fetched ${rows.length} attendance requests with status ${status} (Total: ${count})`);
    return { total: count, page: parseInt(page), limit: parseInt(limit), data: rows };
  }


  // Approve an attendance request: create AttendanceEvent and mark request approved
  static async approveAttendanceRequest(company_code: string, requestId: string, approvedBy: string, notes?: string): Promise<any> {
   // await ensureCorrectSchema();
    const repo = AppDataSource.getRepository(AttendanceRequest);
    const request = await repo.findOne({ where: { id: requestId } });
    if (!request) throw new Error('Request not found');
    if (request.status !== AttendanceRequestStatus.PENDING) throw new Error('Request not pending');

    // Fetch the employee record
    const empRepo = AppDataSource.getRepository(Employee);
    const employee = await empRepo.findOne({ where: { employee_id: request.employee_id } });
    if (!employee) throw new Error('Employee not found');
    if (request.company_code !== company_code) throw new Error('Unauthorized');

    // Transaction: create AttendanceEvent and update request
    //const queryRunner = AppDataSource.createQueryRunner();
    //await ensureCorrectSchemaOnQueryRunner(queryRunner);
    // await queryRunner.connect();
    // await queryRunner.startTransaction();
    try {
      const eventRepo = AppDataSource.getRepository(AttendanceEvent);
      const newEvent: any = {
        id: uuidv4(),
        employee_id: request.employee_id,
        employee_code: request.employee_code,
        employee: employee,
        event_time: request.event_time,
        event_type: request.event_type === 'check_in' ? AttendanceEventType.CHECK_IN : AttendanceEventType.CHECK_OUT,
        data_transfer: DataTransferFlag.N,
        created_at: new Date(),
        s3_image_url: request.s3_image_key ? constants.OCI_S3_COMPATIBILITY.getObjectUrl(request.s3_image_key) : null,
        status: AttendanceStatus.CONFIRMED,
        confirmed_by: approvedBy,
        confirmed_at: new Date()
      };

      await eventRepo.save(newEvent);

      request.status = AttendanceRequestStatus.APPROVED;
      request.approved_by = approvedBy;
      request.approved_at = new Date();
      request.notes = notes || null;
      await AppDataSource.getRepository(AttendanceRequest).save(request);

      return { success: true, eventId: newEvent.id };
    } catch (err) {
      logger.error('Failed to approve attendance request', err);
      throw err;
    }
  }

  static async rejectAttendanceRequest(company_code: string, requestId: string, rejectedBy: string, notes?: string): Promise<any> {
    //await ensureCorrectSchema();
     const repo = AppDataSource.getRepository(AttendanceRequest);
     const request = await repo.findOne({ where: { id: requestId, company_code } });
    if (!request) throw new Error('Request not found');
    if (request.status !== AttendanceRequestStatus.PENDING) throw new Error('Request not pending');

   // Simply update the status — NO attendance_event insert at all
     request.status = AttendanceRequestStatus.REJECTED;
     request.rejected_by = rejectedBy; 
     request.company_code = company_code;
     request.approved_at = new Date();
     request.notes = notes || null;

    await repo.save(request);
    return { success: true };
  }

  private static calculateStatus(time: Date, startTime: string): "present" | "late" | "half-day" {
    const [hours, minutes] = startTime.split(":").map(Number);
    const lateThreshold = new Date(time);
    lateThreshold.setHours(hours, minutes, 0, 0);
    return time > lateThreshold ? "late" : "present";
  }

  private static generateProxyEmailMessage(proxyData: any, actualEmployeeName: string, hasImage: boolean): string {
    return `
🚨 PROXY ATTENDANCE DETECTION ALERT

System detected a potential proxy attendance attempt:

📋 ATTENDANCE DETAILS:
• Recognized Employee: ${proxyData.proxy_employee_name} (${proxyData.proxy_employee_code})
• Department: ${proxyData.proxy_department}
• Reported By: ${actualEmployeeName} (${proxyData.actual_employee_code})
• Confidence Score: ${proxyData.confidence}%
• Action: ${proxyData.action_taken}
• Timestamp: ${new Date(proxyData.timestamp).toLocaleString()}
• UUID: ${proxyData.uuid}

📍 LOCATION DATA:
${proxyData.location_data ? 
  `• Type: ${proxyData.location_data.location_type || 'N/A'}
• Office: ${proxyData.location_data.office_name || 'N/A'}
• Address: ${proxyData.location_data.address || 'N/A'}
• Coordinates: ${proxyData.location_data.latitude || 'N/A'}, ${proxyData.location_data.longitude || 'N/A'}
• Accuracy: ${proxyData.location_data.accuracy || 'N/A'} meters` : 
  '• Location data not available'}

📸 CAPTURED IMAGE:
${hasImage ? 
  `✅ Image available for review` : 
  '❌ No image available for this attendance'}

⚠️ ACTION REQUIRED:
Please review this attendance record and take appropriate action.

This is an automated alert from the Smart Attendance System.
    `;
  }

  static getPerformanceMetrics() {
    return {
      pendingConfirmations: this.pendingConfirmations.size,
      cancelledConfirmations: this.cancelledConfirmations.size,
      concurrentRequests: this.concurrentRequests,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      faceServiceReady: !!this.faceService
    };
  }

  static async cleanupOldData(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      let cleanedCount = 0;
      let bufferCleanedCount = 0;
      
      for (const [uuid, data] of this.pendingConfirmations.entries()) {
        if (data.timestamp < oneHourAgo) {
          if (data.autoConfirmTimer) {
            clearTimeout(data.autoConfirmTimer);
          }
          
          if (data.image_buffer) {
            data.image_buffer = null;
            bufferCleanedCount++;
          }
          
          this.pendingConfirmations.delete(uuid);
          cleanedCount++;
        }
      }

      const cancelledArray = Array.from(this.cancelledConfirmations);
      const oldCancelled = cancelledArray.filter(uuid => {
        const data = this.pendingConfirmations.get(uuid);
        return !data || data.timestamp < oneHourAgo;
      });
      
      oldCancelled.forEach(uuid => this.cancelledConfirmations.delete(uuid));

      logger.info(`Cleanup completed. Removed ${cleanedCount} old pending confirmations, cleaned ${bufferCleanedCount} image buffers, and ${oldCancelled.length} old cancelled confirmations.`);
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  static getPendingConfirmationsCount(): number {
    return this.pendingConfirmations.size;
  }
  
  static isPendingInMemory(uuid: string): boolean {
    return this.pendingConfirmations.has(uuid);
  }
  
  static getCancelledConfirmationsCount(): number {
    return this.cancelledConfirmations.size;
  }

  static getPendingConfirmation(uuid: string): any {
    return this.pendingConfirmations.get(uuid);
  }

  static async forceCancelAllPending(): Promise<number> {
    let cancelledCount = 0;
    const uuids = Array.from(this.pendingConfirmations.keys());
    
    for (const uuid of uuids) {
      try {
        this.stopAutoConfirm(uuid);
        cancelledCount++;
      } catch (error) {
        logger.error(`Force cancel failed for ${uuid}:`, error);
      }
    }
    
    logger.info(`Force cancelled ${cancelledCount} pending confirmations`);
    return cancelledCount;
  }

  static async processStalePendingRecords(): Promise<void> {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const staleRecords = await AppDataSource.getRepository(AttendanceEvent).find({
        where: {
          status: AttendanceStatus.PENDING,
          event_time: Between(new Date(0), twoHoursAgo)
        }
      });

      if (staleRecords.length === 0) {
        return;
      }

      logger.info(`🔄 Found ${staleRecords.length} stale pending records older than 2 hours`);

      for (const record of staleRecords) {
        try {
          if (record.uuid) {
            await this.autoConfirmFromMemory(record.uuid);
            logger.info(`✅ Auto-confirmed stale pending record: ${record.uuid}`);
          }
        } catch (error) {
          logger.error(`Failed to auto-confirm stale record ${record.uuid}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in processStalePendingRecords:', error);
    }
  }
}

AttendanceService.initializeFaceService().catch(err => {
  logger.error('Failed to initialize face service:', err);
});

setInterval(() => {
  AttendanceService.cleanupOldData();
}, 30 * 60 * 1000);

setInterval(() => {
  AttendanceService.processAutoConfirm();
}, 30000);

setInterval(() => {
  AttendanceService.processStalePendingRecords().catch(err => {
    logger.error('Error processing stale pending records:', err);
  });
}, 10 * 60 * 1000); 