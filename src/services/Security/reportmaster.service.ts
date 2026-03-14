import { getRepository } from "../../database/connection";
import { ReportMaster } from "../../entity/Security/reportmaster.entity";
import { FindOptionsWhere } from "typeorm";

export class ReportMasterService {
  private static getReportMasterRepository() {
    return getRepository(ReportMaster);
  }

  static async findByReportIdAndName(
    reportid: string,
    reportname: string,
    module: string
  ): Promise<ReportMaster | null> {
    const repository = this.getReportMasterRepository();
    return await repository.findOne({
      where: { reportid, reportname, module },
    });
  }

  static async findDuplicate(params: {
    reportid: string;
    reportname: string;
    module: string;
    company_code: string;
  }): Promise<ReportMaster | null> {
    const repository = this.getReportMasterRepository();
    return await repository.findOne({
      where: {
        reportid: params.reportid,
        reportname: params.reportname,
        module: params.module,
        company_code: params.company_code,
      },
    });
  }

  static async findByReportNo(report_no: number): Promise<ReportMaster | null> {
    const repository = this.getReportMasterRepository();
    return await repository.findOne({
      where: { report_no },
    });
  }

  static async findByReportNameAndNo(
    reportname: string,
    report_no: number
  ): Promise<ReportMaster | null> {
    const repository = this.getReportMasterRepository();
    return await repository.findOne({
      where: { reportname, report_no },
    });
  }

  static async createReport(reportData: {
    reportid: string;
    reportname: string;
    module: string;
    company_code: string;
    created_by: string;
    updated_by: string;
  }): Promise<ReportMaster> {
    const repository = this.getReportMasterRepository();

    // Get the next report_no
    const maxReportNo = await repository
      .createQueryBuilder("reportMaster")
      .select("MAX(reportMaster.report_no)", "max")
      .getRawOne();

    const nextReportNo = (maxReportNo?.max || 0) + 1;

    const report = repository.create({
      ...reportData,
      report_no: nextReportNo,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await repository.save(report);
  }

  static async updateReport(
    report_no: number,
    updateData: {
      reportname?: string;
      module?: string;
      reportid?: string;
      updated_by: string;
    }
  ): Promise<boolean> {
    const repository = this.getReportMasterRepository();

    const result = await repository.update(
      { report_no },
      {
        ...updateData,
        updated_at: new Date(),
      }
    );

    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Find all reports with dynamic filtering and sorting
   * @param where - TypeORM where conditions
   * @param order - Optional sorting configuration
   * @returns Array of ReportMaster entities and total count
   */
  static async findAllWithFilters(
    where: FindOptionsWhere<ReportMaster>,
    order?: { [key: string]: "ASC" | "DESC" }
  ): Promise<{ data: ReportMaster[]; totalCount: number }> {
    const repository = this.getReportMasterRepository();

    const [data, totalCount] = await repository.findAndCount({
      where,
      ...(order && Object.keys(order).length > 0 && { order }),
    });

    return { data, totalCount };
  }
}
