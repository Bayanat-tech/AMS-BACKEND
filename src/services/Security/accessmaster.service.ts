import { AppDataSource, getRepository } from "../../database/connection";
import { AccessUserSecRoleAccess } from "../../entity/Security/accessusersecroleaccess.entity";
import { AccessSecModuleData } from "../../entity/Security/accesssecmoduledata.entity";
import { AccessSecOperation } from "../../entity/Security/accesssecoperation.entity";

export class AccessMasterService {
  // ==================== ACCESS USER SEC ROLE ACCESS METHODS ====================

  // Regular methods without transactions
  static async findUserAccess(
    loginid: string,
    serial_no_or_role_id: number,
    company_code: string
  ): Promise<AccessUserSecRoleAccess | null> {
    const repository = getRepository(AccessUserSecRoleAccess);
    return await repository.findOne({
      where: { loginid, serial_no_or_role_id, company_code },
    });
  }

  static async createUserAccess(accessData: {
    loginid: string;
    serial_no_or_role_id: number;
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
  }): Promise<AccessUserSecRoleAccess> {
    const repository = getRepository(AccessUserSecRoleAccess);
    const access = repository.create(accessData);
    return await repository.save(access);
  }

  // ==================== ACCESS SEC OPERATION METHODS ====================

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
      company_code: operation.company_code,
    }));
  }

  static async getModuleWithOperations(
    serial_no: number
  ): Promise<AccessSecModuleData | null> {
    const repository = getRepository(AccessSecModuleData);
    return await repository.findOne({
      where: { serial_no },
      relations: ["operations"], // This loads the related AccessSecOperation entities
    });
  }

  static async createOperation(operationData: {
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
  }): Promise<AccessSecOperation> {
    const repository = getRepository(AccessSecOperation);

    // Check if module exists first
    const moduleExists = await getRepository(AccessSecModuleData).findOne({
      where: { serial_no: operationData.serial_no },
    });

    if (!moduleExists) {
      throw new Error(
        `Module with serial_no ${operationData.serial_no} not found`
      );
    }

    const operation = repository.create(operationData);
    return await repository.save(operation);
  }

  static async updateOperation(
    serial_no: number,
    updateData: Partial<{
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
    }>
  ): Promise<boolean> {
    const repository = getRepository(AccessSecOperation);
    const result = await repository.update({ serial_no }, updateData);
    return result.affected ? result.affected > 0 : false;
  }

  // ==================== TRANSACTION METHODS USING AccessSecOperation ====================

  static async createModuleWithOperationsTransaction(
    moduleData: {
      serial_no: number;
      app_code: string;
      level3: string;
      company_code: string;
    },
    operationsData: Array<{
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
    }>
  ): Promise<{
    module: AccessSecModuleData;
    operations: AccessSecOperation[];
  }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const moduleRepository =
        queryRunner.manager.getRepository(AccessSecModuleData);
      const operationRepository =
        queryRunner.manager.getRepository(AccessSecOperation);

      // Create module
      const module = moduleRepository.create(moduleData);
      const savedModule = await moduleRepository.save(module);

      // Create operations linked to the module
      const operations = operationsData.map((opData) =>
        operationRepository.create({
          ...opData,
          serial_no: savedModule.serial_no, // Same serial_no to establish relationship
          company_code: savedModule.company_code,
        })
      );

      const savedOperations = await operationRepository.save(operations);

      await queryRunner.commitTransaction();

      return {
        module: savedModule,
        operations: savedOperations,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async syncModuleOperationsTransaction(
    serial_no: number,
    operationsData: Array<{
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
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const moduleRepository =
        queryRunner.manager.getRepository(AccessSecModuleData);
      const operationRepository =
        queryRunner.manager.getRepository(AccessSecOperation);

      // Check if module exists
      const module = await moduleRepository.findOne({ where: { serial_no } });
      if (!module) {
        throw new Error(`Module with serial_no ${serial_no} not found`);
      }

      // Delete existing operations
      await operationRepository.delete({ serial_no });

      // Create new operations
      const operations = operationsData.map((opData) =>
        operationRepository.create({
          ...opData,
          serial_no: module.serial_no,
          company_code: module.company_code,
        })
      );

      await operationRepository.save(operations);
      await queryRunner.commitTransaction();

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Complex transaction involving both entities
  static async updateUserAccessAndOperationsTransaction(
    userAccessData: {
      loginid: string;
      serial_no_or_role_id: number;
      company_code: string;
      updateData: any;
    },
    operationUpdates: Array<{
      serial_no: number;
      updateData: any;
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userAccessRepository = queryRunner.manager.getRepository(
        AccessUserSecRoleAccess
      );
      const operationRepository =
        queryRunner.manager.getRepository(AccessSecOperation);

      // Update user access
      const userAccessResult = await userAccessRepository.update(
        {
          loginid: userAccessData.loginid,
          serial_no_or_role_id: userAccessData.serial_no_or_role_id,
          company_code: userAccessData.company_code,
        },
        userAccessData.updateData
      );

      // Update operations
      for (const opUpdate of operationUpdates) {
        await operationRepository.update(
          { serial_no: opUpdate.serial_no },
          opUpdate.updateData
        );
      }

      await queryRunner.commitTransaction();
      return userAccessResult.affected ? userAccessResult.affected > 0 : false;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== EXISTING TRANSACTION METHODS (for completeness) ====================

  static async updateUserAccessWithTransaction(
    loginid: string,
    serial_no_or_role_id: number,
    company_code: string,
    updateData: any
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(
        AccessUserSecRoleAccess
      );

      // Check if record exists
      const existingAccess = await repository.findOne({
        where: { loginid, serial_no_or_role_id, company_code },
      });

      if (!existingAccess) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      // Update the record
      const result = await repository.update(
        { loginid, serial_no_or_role_id, company_code },
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

  static async deleteUserAccessesWithTransaction(
    accesses: Array<{
      serial_no_or_role_id: number;
      loginid: string;
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(
        AccessUserSecRoleAccess
      );

      let totalDeleted = 0;

      for (const access of accesses) {
        const result = await repository.delete({
          serial_no_or_role_id: access.serial_no_or_role_id,
          loginid: access.loginid,
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

  // Get operations with transaction (if needed for consistency)
  static async getModuleWithOperationsTransaction(
    serial_no: number
  ): Promise<AccessSecModuleData | null> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(AccessSecModuleData);
      const moduleData = await repository.findOne({
        where: { serial_no },
        relations: ["operations"],
      });

      await queryRunner.commitTransaction();
      return moduleData;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
