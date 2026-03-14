import { AppDataSource, getRepository } from "../../database/connection";
import {
  FlowMaster,
  RoleMaster,
  User,
  SecModule,
  Company,
  SecLoginRoleAccess,
  MSPSProjectMaster,
  MsRole,
  AccessSecModuleData,
  SecLoginUserDivision,
  MSHRDivisionMaster,
  ReportMaster,
  QueryMaster,
  AccessRoleAppAccess,
  AccessUserSecRoleAccess,
  AccessUserSecMaster,
} from "../../entity/Security/index";
import {
  Like,
  Not,
  IsNull,
  FindOptionsWhere,
  FindManyOptions,
  In,
  ObjectLiteral,
  FindOptionsOrder,
  DeleteResult,
} from "typeorm";

export class SecurityMasterService {
  private static async getMasterDataWithPagination<T extends ObjectLiteral>(
    entity: new () => T,
    whereCondition: FindOptionsWhere<T>,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean }
  ): Promise<{ tableData: T[]; count: number }> {
    const repository = getRepository(entity);

    const skip = (page - 1) * limit;

    const findOptions: FindManyOptions<T> = {
      where: whereCondition,
      skip,
      take: limit,
    };

    if (sort && sort.field_name) {
      const order: FindOptionsOrder<T> = {
        [sort.field_name]: sort.desc ? "DESC" : "ASC",
      } as FindOptionsOrder<T>;
      findOptions.order = order;
    }

    const [tableData, count] = await repository.findAndCount(findOptions);

    return { tableData, count };
  }

  private static buildSearchCondition<T extends ObjectLiteral>(
    company_code: string,
    searchFilter?: any
  ): FindOptionsWhere<T> {
    let whereCondition: FindOptionsWhere<T> = { company_code } as any;

    if (searchFilter && searchFilter.field && searchFilter.value) {
      whereCondition = {
        ...whereCondition,
        [searchFilter.field]: Like(`%${searchFilter.value}%`),
      } as any;
    }

    return whereCondition;
  }

  // ==================== SPECIFIC MASTER METHODS ====================

  static async getCompanyMaster(
    company_code: string,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean }
  ) {
    return await this.getMasterDataWithPagination<Company>(
      Company,
      {},
      page,
      limit,
      sort
    );
  }

  static async getRoleMaster(
    company_code: string,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean },
    searchFilter?: any
  ) {
    const whereCondition = this.buildSearchCondition<RoleMaster>(
      company_code,
      searchFilter
    );
    return await this.getMasterDataWithPagination<RoleMaster>(
      RoleMaster,
      whereCondition,
      page,
      limit,
      sort
    );
  }

  static async getFlowMaster(
    company_code: string,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean },
    searchFilter?: any
  ) {
    const whereCondition = this.buildSearchCondition<FlowMaster>(
      company_code,
      searchFilter
    );
    return await this.getMasterDataWithPagination<FlowMaster>(
      FlowMaster,
      whereCondition,
      page,
      limit,
      sort
    );
  }

  static async getSecLogin(
    company_code: string,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean },
    searchFilter?: any
  ) {
    const whereCondition = this.buildSearchCondition<User>(
      company_code,
      searchFilter
    );
    return await this.getMasterDataWithPagination<User>(
      User,
      whereCondition,
      page,
      limit,
      sort
    );
  }

  static async getSecModuleData(
    company_code: string,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean },
    searchFilter?: any
  ) {
    const whereCondition = this.buildSearchCondition<SecModule>(
      company_code,
      searchFilter
    );
    return await this.getMasterDataWithPagination<SecModule>(
      SecModule,
      whereCondition,
      page,
      limit,
      sort
    );
  }

  static async getProjectAccess(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    return await this.getMasterDataWithPagination<SecLoginRoleAccess>(
      SecLoginRoleAccess,
      { company_code } as FindOptionsWhere<SecLoginRoleAccess>,
      page,
      limit
    );
  }

  static async getProjects(
    company_code: string,
    page: number = 1,
    limit: number = 100
  ) {
    return await this.getMasterDataWithPagination<MSPSProjectMaster>(
      MSPSProjectMaster,
      { company_code } as FindOptionsWhere<MSPSProjectMaster>,
      page,
      limit
    );
  }

  static async getUserRoleAccess(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    return await this.getMasterDataWithPagination<SecLoginRoleAccess>(
      SecLoginRoleAccess,
      { company_code } as FindOptionsWhere<SecLoginRoleAccess>,
      page,
      limit
    );
  }

  static async getRoles(
    company_code: string,
    page: number = 1,
    limit: number = 100
  ) {
    return await this.getMasterDataWithPagination<MsRole>(
      MsRole,
      { company_code } as FindOptionsWhere<MsRole>,
      page,
      limit
    );
  }

  static async getAccessAssignRole(
    company_code: string,
    page: number = 1,
    limit: number = 20
  ) {
    const whereCondition: FindOptionsWhere<AccessRoleAppAccess> = {
      company_code,
    } as any;

    return await this.getMasterDataWithPagination<AccessRoleAppAccess>(
      AccessRoleAppAccess,
      whereCondition,
      page,
      limit
    );
  }

  static async getSerialNo(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    const whereCondition: FindOptionsWhere<AccessSecModuleData> = {
      company_code,
      level3: Not(IsNull()),
    } as any;

    return await this.getMasterDataWithPagination<AccessSecModuleData>(
      AccessSecModuleData,
      whereCondition,
      page,
      limit
    );
  }

  static async getAccessAssignUser(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
   
    const whereCondition: any = { company_code };
    console.log("access chotu pagal he ", company_code)

    return await this.getMasterDataWithPagination<AccessUserSecMaster>(
      AccessUserSecMaster,
      whereCondition,
      page,
      limit
    );
  }

  static async getSecModuleDropdown(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    return await this.getMasterDataWithPagination<SecModule>(
      SecModule,
      { company_code } as FindOptionsWhere<SecModule>,
      page,
      limit
    );
  }

  static async getUserDivisionAccess(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    return await this.getMasterDataWithPagination<SecLoginUserDivision>(
      SecLoginUserDivision,
      { company_code } as FindOptionsWhere<SecLoginUserDivision>,
      page,
      limit
    );
  }

  static async getDivisions(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    return await this.getMasterDataWithPagination<MSHRDivisionMaster>(
      MSHRDivisionMaster,
      { company_code } as FindOptionsWhere<MSHRDivisionMaster>,
      page,
      limit
    );
  }

  static async getReportMaster(
    company_code: string,
    page: number = 1,
    limit: number = 200
  ) {
    return await this.getMasterDataWithPagination<ReportMaster>(
      ReportMaster,
      { company_code } as FindOptionsWhere<ReportMaster>,
      page,
      limit
    );
  }

  static async getQueryMaster(
    company_code: string,
    page: number = 1,
    limit: number = 20,
    sort?: { field_name: string; desc: boolean }
  ) {
    return await this.getMasterDataWithPagination<QueryMaster>(
      QueryMaster,
      {}, // No company_code filter for query master
      page,
      limit,
      sort
    );
  }

  // ==================== DELETE METHODS ====================
  static async deleteMasterRecords(
    master: string,
    company_code: string,
    ids: (string | number)[]
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let result: DeleteResult;

      switch (master) {
        case "flow_master":
          result = await queryRunner.manager.delete(FlowMaster, {
            company_code,
            flow_code: In(ids as string[]),
          });
          break;

        case "role_master":
          result = await queryRunner.manager.delete(RoleMaster, {
            company_code,
            role_id: In(ids as number[]),
          });
          break;

        case "sec_login":
          result = await queryRunner.manager.delete(User, {
            company_code,
            id: In(ids as number[]),
          });
          break;

        case "sec_module_data":
          result = await queryRunner.manager.delete(SecModule, {
            company_code,
            serial_no: In(ids as number[]),
          });
          break;

        case "sec_company":
          result = await queryRunner.manager.delete(Company, {
            company_code: In(ids as string[]),
          });
          break;

        case "report_master":
          result = await queryRunner.manager.delete(ReportMaster, {
            report_no: In(ids as number[]),
          });
          break;

        case "query_master":
          result = await queryRunner.manager.delete(QueryMaster, {
            sr_no: In(ids as number[]),
          });
          break;

        default:
          throw new Error(`Unknown master type: ${master}`);
      }

      await queryRunner.commitTransaction();
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Alternative delete method using repository pattern
  //   static async deleteMasterRecordsAlternative(
  //     master: string,
  //     company_code: string,
  //     ids: (string | number)[]
  //   ): Promise<boolean> {
  //     const queryRunner = AppDataSource.createQueryRunner();
  //     await queryRunner.connect();
  //     await queryRunner.startTransaction();

  //     try {
  //       let repository;

  //       switch (master) {
  //         case "flow_master":
  //           repository = queryRunner.manager.getRepository(FlowMaster);
  //           break;
  //         case "role_master":
  //           repository = queryRunner.manager.getRepository(RoleMaster);
  //           break;
  //         case "sec_login":
  //           repository = queryRunner.manager.getRepository(User);
  //           break;
  //         case "sec_module_data":
  //           repository = queryRunner.manager.getRepository(SecModule);
  //           break;
  //         case "sec_company":
  //           repository = queryRunner.manager.getRepository(Company);
  //           break;
  //         case "report_master":
  //           repository = queryRunner.manager.getRepository(ReportMaster);
  //           break;
  //         case "query_master":
  //           repository = queryRunner.manager.getRepository(QueryMaster);
  //           break;
  //         default:
  //           throw new Error(`Unknown master type: ${master}`);
  //       }

  //       // This is the line that was showing the method signature - it's correct!
  //       const result: DeleteResult = await repository.delete({
  //         company_code,
  //         [this.getDeleteFieldName(master)]: In(ids),
  //       });

  //       await queryRunner.commitTransaction();
  //       return result.affected ? result.affected > 0 : false;
  //     } catch (error) {
  //       await queryRunner.rollbackTransaction();
  //       throw error;
  //     } finally {
  //       await queryRunner.release();
  //     }
  //   }

  // Helper method to get the correct field name for deletion
  private static getDeleteFieldName(master: string): string {
    const fieldMap: { [key: string]: string } = {
      flow_master: "flow_code",
      role_master: "role_id",
      sec_login: "loginid",
      sec_module_data: "serial_no",
      sec_company: "company_code",
      report_master: "report_no",
      query_master: "sr_no",
    };

    return fieldMap[master] || "id";
  }
}

