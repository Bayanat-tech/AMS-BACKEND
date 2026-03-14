import { getRepository } from "../database/connection";
import { Log } from "../entity/Log";

export class LogService {
  private static getLogRepository() {
    return getRepository(Log);
  }

  static async countUserLogs(
    company_code: string,
    loginid: string
  ): Promise<number> {
    const logRepository = this.getLogRepository();
    return await logRepository.count({
      where: { company_code, loginid },
    });
  }

  static async countUnreadLogs(
    company_code: string,
    loginid: string
  ): Promise<number> {
    const logRepository = this.getLogRepository();
    return await logRepository.count({
      where: { company_code, loginid, read: "N" },
    });
  }

  static async getUserLogs(
    company_code: string,
    loginid: string
  ): Promise<Log[]> {
    const logRepository = this.getLogRepository();
    return await logRepository.find({
      where: { company_code, loginid },
      order: { updated_at: "DESC" },
    });
  }

  static async markLogsAsRead(
    company_code: string,
    loginid: string,
    updated_by: string
  ): Promise<boolean> {
    const logRepository = this.getLogRepository();
    const result = await logRepository.update(
      { company_code, loginid, read: "N" },
      { read: "Y", updated_by }
    );

    return result.affected ? result.affected > 0 : false;
  }

  static async createLog(logData: {
    company_code: string;
    loginid: string;
    module: string;
    description: string;
    read: string;
    created_by: string;
    updated_by: string;
  }): Promise<Log> {
    const logRepository = this.getLogRepository();
    const log = logRepository.create(logData);
    return await logRepository.save(log);
  }
}
