import { Request, Response } from "express";
import { Employee } from "../../entity/Attendance/employee.entity";
import { AttendanceRecord }from "../../entity/Attendance/attendance_record.entity";
import logger from "../../utils/logger";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subDays,
} from "date-fns";
import { AppDataSource, oracleDb } from "../../database/connection";
import { Between, MoreThanOrEqual } from "typeorm";
//import employee from "../../models/Attendance/employee";

interface DepartmentSummary {
  total: number;
  present: number;
  late: number;
  halfDay: number;
}

interface DepartmentStats {
  [department: string]: DepartmentSummary;
}

interface DailySummaryStats {
  total: number;
  present: number;
  late: number;
  halfDay: number;
  byDepartment: DepartmentStats;
}

interface MonthlyStats {
  [date: string]: {
    present: number;
    late: number;
    halfDay: number;
    total: number;
  };
}

interface BaseRecord {
  id: string;
  employee_id: string;
  date: Date;
  status: "present" | "late" | "half-day";
  check_in?: Date;
  check_out?: Date;
}

interface AttendanceWithEmployee extends BaseRecord {
  employee: {
    department: string;
    full_name: string;
  };
}

interface AttendanceWithCount extends BaseRecord {
  count: number;
}

interface AttendanceWithLateCount extends BaseRecord {
  lateCount: number;
}

export class DashboardController {
  static async getDailySummary(req: Request, res: Response): Promise<void> {
    try {
      const today = new Date();

      const Attendance = AppDataSource.getRepository(AttendanceRecord);
      const summary = await Attendance.find({
        where: {
          record_date: Between(
             startOfDay(today),
             endOfDay(today),
          ),
        },
        relations: {
          employee: true,
        },
        select: ["status", "check_in", "check_out", "employee_id"],
      }) as unknown as AttendanceWithEmployee[];

      const stats: DailySummaryStats = {
        total: summary.length,
        present: summary.filter((r) => r.status === "present").length,
        late: summary.filter((r) => r.status === "late").length,
        halfDay: summary.filter((r) => r.status === "half-day").length,
        byDepartment: {},
      };

      summary.forEach((record) => {
        const dept = record.employee.department;
        if (!stats.byDepartment[dept]) {
          stats.byDepartment[dept] = {
            total: 0,
            present: 0,
            late: 0,
            halfDay: 0,
          };
        }
        stats.byDepartment[dept].total++;
        stats.byDepartment[dept][
          record.status === "half-day" ? "halfDay" : record.status
        ]++;
      });

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      logger.error("Failed to get daily summary", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getDepartmentStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate
        ? new Date(startDate as string)
        : startOfMonth(new Date());
      const end = endDate
        ? new Date(endDate as string)
        : endOfMonth(new Date());

      // Use a raw query to avoid the ambiguous column issue
      const [results] = await oracleDb.query(
        `
        SELECT 
          DATE(ar.date) as date,
          e.department,
          ar.status,
          COUNT(ar.id) as count
        FROM attendance_records ar
        INNER JOIN employees e ON ar.employee_id = e.employee_id
        WHERE ar.date BETWEEN :start AND :end
        GROUP BY DATE(ar.date), e.department, ar.status
        ORDER BY date ASC
      `,
        {
          replacements: {
            start: startOfDay(start).toISOString().split("T")[0],
            end: endOfDay(end).toISOString().split("T")[0],
          },
        }
      );

      const departmentWiseStats: {
        [key: string]: {
          [key: string]: { present: number; late: number; halfDay: number };
        };
      } = {};

      (results as any[]).forEach((record: any) => {
        const { date, department, status, count } = record;

        if (!departmentWiseStats[department]) {
          departmentWiseStats[department] = {};
        }

        const dateStr = new Date(date).toISOString().split("T")[0];
        if (!departmentWiseStats[department][dateStr]) {
          departmentWiseStats[department][dateStr] = {
            present: 0,
            late: 0,
            halfDay: 0,
          };
        }

        const statusKey: "present" | "late" | "halfDay" =
          status === "half-day" ? "halfDay" : status;
        departmentWiseStats[department][dateStr][statusKey] = parseInt(count);
      });

      res.status(200).json({ success: true, data: departmentWiseStats });
    } catch (error: any) {
      logger.error("Failed to get department stats", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMonthlyStats(req: Request, res: Response): Promise<void> {
    try {
      const date = new Date();
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      // Use a raw query to avoid the ambiguous column issue
      const [results] = await oracleDb.query(
        `
        SELECT 
          DATE_FORMAT(date, '%Y-%m-%d') as date,
          status,
          COUNT(id) as count
        FROM attendance_records
        WHERE date BETWEEN :start AND :end
        GROUP BY DATE_FORMAT(date, '%Y-%m-%d'), status
        ORDER BY date ASC
      `,
        {
          replacements: {
            start: startOfDay(monthStart).toISOString().split("T")[0],
            end: endOfDay(monthEnd).toISOString().split("T")[0],
          },
        }
      );

      const monthlyStats: MonthlyStats = {};
      (results as any[]).forEach((record: any) => {
        const { date, status, count } = record;
        if (!monthlyStats[date]) {
          monthlyStats[date] = { present: 0, late: 0, halfDay: 0, total: 0 };
        }
        const statusKey: "present" | "late" | "halfDay" =
          status === "half-day" ? "halfDay" : status;
        monthlyStats[date][statusKey] = parseInt(count);
        monthlyStats[date].total += parseInt(count);
      });

      res.status(200).json({ success: true, data: monthlyStats });
    } catch (error: any) {
      logger.error("Failed to get monthly stats", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getEmployeeHistory(req: Request, res: Response): Promise<void> {
    try {
      const { employee_id } = req.params;
      const { days = 30 } = req.query;
      const startDate = subDays(new Date(), Number(days));

      const attendanceRecord = AppDataSource.getRepository(AttendanceRecord);

      const history = await attendanceRecord.find({
        where: {
          employee_id: employee_id as string,
          record_date: MoreThanOrEqual(startDate),
        },
        relations: {
            employee: true,
          },
         select: {
              record_date: true,
              check_in: true,
              check_out: true,
              status: true,
              employee: {
                full_name: true,
                department: true,
              },
          },
        order: { record_date: "DESC" },
      });

      const stats = {
        // present: history.filter((r) => r.status === "present").length,
        // late: history.filter((r) => r.status === "late").length,
        // halfDay: history.filter((r) => r.status === "half-day").length,

        present: history.filter((r: AttendanceRecord) => r.status === "present").length,
        late: history.filter((r: AttendanceRecord) => r.status === "late").length,
        halfDay: history.filter((r: AttendanceRecord) => r.status === "half-day").length,
        records: history,
      };

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      logger.error("Failed to get employee history", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getLateArrivalTrends(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const startDate = subDays(new Date(), Number(days));

      // Use a raw query to avoid the ambiguous column issue
      const [results] = await oracleDb.query(
        `
        SELECT 
          DATE(date) as date,
          COUNT(id) as lateCount
        FROM attendance_records
        WHERE date BETWEEN :start AND :end
          AND status = 'late'
        GROUP BY DATE(date)
        ORDER BY date ASC
      `,
        {
          replacements: {
            start: startOfDay(startDate).toISOString().split("T")[0],
            end: endOfDay(new Date()).toISOString().split("T")[0],
          },
        }
      );

      const trendStats = {
        totalLateArrivals: (results as any[]).reduce(
          (sum, record) => sum + parseInt(record.lateCount),
          0
        ),
        dailyTrends: (results as any[]).reduce<{ [key: string]: number }>(
          (acc, record) => {
            const dateStr = new Date(record.date).toISOString().split("T")[0];
            acc[dateStr] = parseInt(record.lateCount);
            return acc;
          },
          {}
        ),
      };

      res.status(200).json({ success: true, data: trendStats });
    } catch (error: any) {
      logger.error("Failed to get late arrival trends", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
