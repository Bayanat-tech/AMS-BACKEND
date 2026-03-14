import cron from "node-cron";
import logger from "../../utils/logger";
import { HrService } from "../../services/hr.service";
import { AppDataSource } from "../../database/connection";
import { AttendanceEvent, DataTransferFlag, AttendanceStatus } from "../../entity/Attendance/attendance_events.entity";

export class AttendanceEventScheduler {
  private static isRunning = false;
  private static readonly BATCH_SIZE = 100;

  static initializeScheduler(): void {
    
    cron.schedule("*/60 * * * *", async () => {
      await this.processUnsentEvents();
    });

    logger.info(
      "Attendance event scheduler initialized (runs every 60 minutes)"
    );
  }

  static async processUnsentEvents(): Promise<void> {
    if (this.isRunning) {
      logger.info("Scheduler is already running, skipping this execution");
      return;
    }
    this.isRunning = true;

    const attendanceRepository = AppDataSource.getRepository(AttendanceEvent);
    try {
      logger.info("Starting to process unsent attendance events...");

      const unsentEvents = await attendanceRepository.find({
        where: {
          data_transfer: DataTransferFlag.N,
          status: AttendanceStatus.CONFIRMED,
        },
        take: this.BATCH_SIZE,
        order: {
          event_time: "ASC",
        },
      });

      if (unsentEvents.length === 0) {
        logger.info("No unsent attendance events found");
        return;
      }

      logger.info(`Found ${unsentEvents.length} unsent attendance events`);

      const eventsToSend = unsentEvents.map((event: any) => ({
        id: event.id,
        employeeId: event.employee_id,
        employeeCode: event.employee_code,
        attendanceRecordId: event.attendance_record_id ?? undefined,
        eventTime: event.event_time,
        eventType: event.event_type,
        createdAt: event.created_at,
      }));

      const result = await HrService.bulkInsertAttendanceEvents(eventsToSend);
      if (result && result.successfulInserts > 0) {
        const eventIds = unsentEvents.map((event: any) => event.id);
        const transferDate = new Date();

        logger.info(`Updating ${eventIds.length} records with DATA_TRANSFER = 'Y'`);

        for (const eventId of eventIds) {
          await attendanceRepository.update(
            { id: eventId },
            {
              data_transfer: DataTransferFlag.Y,
              transfer_date: transferDate,
            }
          );
        }

        logger.info(
          `Successfully processed ${unsentEvents.length} attendance events. DATA_TRANSFER updated to 'Y'.`
        );
      } else {
        logger.error(
          `API call completed but reported a failure: ${result.message}`
        );
      }
    } catch (error: any) {
      logger.error("Error processing unsent attendance events:", error);
    } finally {
      this.isRunning = false;
    }
  }

  static async manualTrigger(): Promise<void> {
    logger.info("Manual trigger for attendance event processing");
    await this.processUnsentEvents();
  }

  static async getTransferStats(): Promise<{
    totalUnsent: number;
    totalSent: number;
    lastTransfer: Date | null;
  }> {
    const attendanceRepository = AppDataSource.getRepository(AttendanceEvent);

    const totalUnsent = await attendanceRepository.count({
      where: { data_transfer: DataTransferFlag.N, status: AttendanceStatus.CONFIRMED },
    });

    const totalSent = await attendanceRepository.count({
      where: { data_transfer: DataTransferFlag.Y, status: AttendanceStatus.CONFIRMED },
    });

    const lastTransferRecord = await attendanceRepository.findOne({
      where: { data_transfer: DataTransferFlag.Y, status: AttendanceStatus.CONFIRMED },
      order: { transfer_date: "DESC" },
    });

    return {
      totalUnsent,
      totalSent,
      lastTransfer: lastTransferRecord?.transfer_date || null,
    };
  }
}
