import { getRepository } from "../../database/connection";
import { QueryMaster } from "../../entity/Security/querymaster.entity";
import { Not } from "typeorm";

export class QueryMasterService {
  private static getQueryMasterRepository() {
    return getRepository(QueryMaster);
  }

  static async findBySqlString(
    sql_string: string
  ): Promise<QueryMaster | null> {
    const repository = this.getQueryMasterRepository();
    return await repository.findOne({
      where: { sql_string },
    });
  }

  static async findBySrNo(sr_no: number): Promise<QueryMaster | null> {
    const repository = this.getQueryMasterRepository();
    return await repository.findOne({
      where: { sr_no },
    });
  }

  static async checkDuplicateSqlString(
    sql_string: string,
    excludeSrNo?: number
  ): Promise<QueryMaster | null> {
    const repository = this.getQueryMasterRepository();

    const whereCondition: any = { sql_string };
    if (excludeSrNo) {
      whereCondition.sr_no = Not(excludeSrNo);
    }

    return await repository.findOne({
      where: whereCondition,
    });
  }

  static async createQuery(queryData: {
    company_code: string;
    parameter: string;
    sql_string: string;
    string1?: string;
    string2?: string;
    string3?: string;
    string4?: string;
    order_by?: string;
    ustring1?: string;
    ustring2?: string;
    ustring3?: string;
    ustring4?: string;
    ustring5?: string;
    ustring6?: string;
    created_by: string;
    updated_by: string;
  }): Promise<QueryMaster> {
    const repository = this.getQueryMasterRepository();

    // Get the next SR_NO
    const maxSrNo = await repository
      .createQueryBuilder("queryMaster")
      .select("MAX(queryMaster.sr_no)", "max")
      .getRawOne();

    const nextSrNo = (maxSrNo?.max || 0) + 1;

    const query = repository.create({
      ...queryData,
      sr_no: nextSrNo,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await repository.save(query);
  }

  static async updateQuery(sr_no: number, updateData: any): Promise<boolean> {
    const repository = this.getQueryMasterRepository();

    const result = await repository.update(
      { sr_no },
      {
        ...updateData,
        updated_at: new Date(),
      }
    );

    return result.affected ? result.affected > 0 : false;
  }
}
