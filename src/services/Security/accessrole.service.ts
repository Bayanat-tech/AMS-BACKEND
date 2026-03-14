import { AppDataSource, getRepository } from "../../database/connection";
import { AccessRoleAppAccess } from "../../entity/Security/accessroleappaccess.entity";
import { AccessSecModuleData } from "../../entity/Security/accesssecmoduledata.entity";
import { AccessSecOperation } from "../../entity/Security/accesssecoperation.entity";


export class AccessRoleService {
  // ==================== ACCESS ROLE APP ACCESS METHODS ====================

  static async findRoleAccess(
    role_id: number,
    serial_no: number,
    company_code: string
  ): Promise<AccessRoleAppAccess | null> {
    const repository = getRepository(AccessRoleAppAccess);
    return await repository.findOne({
      where: { role_id, serial_no, company_code },
    });
  }

  static async createRoleAccess(accessData: {
    role_id: number;
    serial_no: number;
    snew: string;
    smodify: string;
    sdelete: string;
    ssave: string;
    ssearch: string;
    ssaveas: string;
    supload: string;
    sundo: string;
    sprint: string;
    sprintsetup: string;
    shelp: string;
    company_code: string;
  }): Promise<AccessRoleAppAccess> {
    const repository = getRepository(AccessRoleAppAccess);
    const access = repository.create(accessData);
    return await repository.save(access);
  }

  static async updateRoleAccessWithTransaction(
    role_id: number,
    serial_no: number,
    company_code: string,
    updateData: any
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(AccessRoleAppAccess);

      const existingAccess = await repository.findOne({
        where: { role_id, serial_no, company_code },
      });

      if (!existingAccess) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      const result = await repository.update(
        { role_id, serial_no, company_code },
        updateData
      );

      await queryRunner.commitTransaction();
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async deleteRoleAccessesWithTransaction(
    accesses: Array<{
      serial_no: number;
      role_id: number;
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(AccessRoleAppAccess);

      let totalDeleted = 0;

      for (const access of accesses) {
        const result = await repository.delete({
          serial_no: access.serial_no,
          role_id: access.role_id,
        });

        if (result.affected) {
          totalDeleted += result.affected;
        }
      }

      await queryRunner.commitTransaction();
      return totalDeleted > 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== ACCESS SEC MODULE DATA & OPERATIONS METHODS ====================

  static async getOperationsByModule(serial_no: number): Promise<any[]> {
    const moduleData = await this.getModuleWithOperations(serial_no);

    if (!moduleData || !moduleData.operations) {
      return [];
    }

    return moduleData.operations.map((operation) => ({
      serial_no: operation.serial_no,
      snew: operation.snew,
      smodify: operation.smodify,
      sdelete: operation.sdelete,
      ssave: operation.ssave,
      ssearch: operation.ssearch,
      ssaveas: operation.ssaveas,
      supload: operation.supload,
      sundo: operation.sundo,
      sprint: operation.sprint,
      sprintsetup: operation.sprintsetup,
      shelp: operation.shelp,
    }));
  }

  static async getModuleWithOperations(
    serial_no: number
  ): Promise<AccessSecModuleData | null> {
    const repository = getRepository(AccessSecModuleData);
    return await repository.findOne({
      where: { serial_no },
      relations: ["operations"],
    });
  }

  // ==================== BULK OPERATIONS ====================

  static async createMultipleRoleAccessesWithTransaction(
    accessesData: Array<{
      role_id: number;
      serial_no: number;
      snew: string;
      smodify: string;
      sdelete: string;
      ssave: string;
      ssearch: string;
      ssaveas: string;
      supload: string;
      sundo: string;
      sprint: string;
      sprintsetup: string;
      shelp: string;
      company_code: string;
    }>
  ): Promise<AccessRoleAppAccess[]> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(AccessRoleAppAccess);

      const accessEntities = accessesData.map((data) =>
        repository.create(data)
      );
      const savedAccesses = await repository.save(accessEntities);

      await queryRunner.commitTransaction();
      return savedAccesses;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
