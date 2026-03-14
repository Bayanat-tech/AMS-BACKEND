import { getRepository } from "../database/connection";
import { TiPackdetSeries } from "../entity/TiPackdetSeries";

export class TiPackdetSeriesService {
  private static getRepository() {
    return getRepository(TiPackdetSeries);
  }

  static async findByCompanyPrinJob(
    company_code: string,
    prin_code: string,
    job_no: string
  ): Promise<TiPackdetSeries[]> {
    const repository = this.getRepository();
    return await repository.find({
      where: { company_code, prin_code, job_no },
      order: { packdet_no: "ASC" },
    });
  }

  static async findByPackdetNo(
    company_code: string,
    prin_code: string,
    job_no: string,
    packdet_no: number
  ): Promise<TiPackdetSeries[]> {
    const repository = this.getRepository();
    return await repository.find({
      where: { company_code, prin_code, job_no, packdet_no },
    });
  }

  static async findBySerialNumber(
    company_code: string,
    prin_code: string,
    job_no: string,
    serial_number: string
  ): Promise<TiPackdetSeries | null> {
    const repository = this.getRepository();
    return await repository.findOne({
      where: { company_code, prin_code, job_no, serial_number },
    });
  }

  // Create new record
  static async create(data: {
    company_code: string;
    prin_code: string;
    job_no: string;
    packdet_no: number;
    serial_number: string;
    label_number: string;
    quantity: number;
    prod_code: string;
    created_by: string;
    updated_by: string;
    remarks?: string;
    container_no?: string;
    distributer?: string;
  }): Promise<TiPackdetSeries> {
    const repository = this.getRepository();
    const record = repository.create(data);
    return await repository.save(record);
  }

  // Create multiple records
  static async createMultiple(
    records: Array<{
      company_code: string;
      prin_code: string;
      job_no: string;
      packdet_no: number;
      serial_number: string;
      label_number: string;
      quantity: number;
      prod_code: string;
      created_by: string;
      updated_by: string;
      remarks?: string;
      container_no?: string;
      distributer?: string;
    }>
  ): Promise<TiPackdetSeries[]> {
    const repository = this.getRepository();
    const entities = repository.create(records);
    return await repository.save(entities);
  }

  // Update record
  static async update(
    company_code: string,
    prin_code: string,
    job_no: string,
    packdet_no: number,
    serial_number: string,
    updateData: {
      quantity?: number;
      remarks?: string;
      label_number?: string;
      container_no?: string;
      distributer?: string;
      updated_by: string;
    }
  ): Promise<boolean> {
    const repository = this.getRepository();

    const result = await repository.update(
      { company_code, prin_code, job_no, packdet_no, serial_number },
      updateData
    );

    return result.affected ? result.affected > 0 : false;
  }


  static async delete(
    company_code: string,
    prin_code: string,
    job_no: string,
    packdet_no: number,
    serial_number: string
  ): Promise<boolean> {
    const repository = this.getRepository();

    const result = await repository.delete({
      company_code,
      prin_code,
      job_no,
      packdet_no,
      serial_number,
    });

    return result.affected ? result.affected > 0 : false;
  }

  // Get count by pack detail
  static async getCountByPackdet(
    company_code: string,
    prin_code: string,
    job_no: string,
    packdet_no: number
  ): Promise<number> {
    const repository = this.getRepository();
    return await repository.count({
      where: { company_code, prin_code, job_no, packdet_no },
    });
  }

  static async getTotalQuantityByPackdet(
    company_code: string,
    prin_code: string,
    job_no: string,
    packdet_no: number
  ): Promise<number> {
    const repository = this.getRepository();

    const result = await repository
      .createQueryBuilder("series")
      .select("SUM(series.quantity)", "total")
      .where("series.company_code = :company_code", { company_code })
      .andWhere("series.prin_code = :prin_code", { prin_code })
      .andWhere("series.job_no = :job_no", { job_no })
      .andWhere("series.packdet_no = :packdet_no", { packdet_no })
      .getRawOne();

    return result?.total || 0;
  }
}
