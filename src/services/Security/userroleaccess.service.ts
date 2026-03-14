import { AppDataSource, getRepository } from "../../database/connection";
import { SecLoginRoleAccess } from "../../entity/Security/seclogin-roleaccess.entity";
import { MsRole } from "../../entity/Security/msrole.entity";
import { MsPsUserRoleMapping } from "../../entity/Security/mspsuserrolemapping.entity";

export class UserRoleAccessService {
  // ==================== USER ROLE MAPPING METHODS ====================

  static async createUserRoleMapping(mappingData: {
    user_id: string;
    user_role: string;
    company_code: string;
    user_code?: string;
    user_name?: string;
    user_dt?: Date;
  }): Promise<MsPsUserRoleMapping> {
    const repository = getRepository(MsPsUserRoleMapping);

    // Check if mapping already exists
    const existingMapping = await repository.findOne({
      where: { user_id: mappingData.user_id, user_role: mappingData.user_role },
    });

    if (existingMapping) {
      throw new Error("Role already assigned to this user");
    }

    const mapping = repository.create({
      ...mappingData,
      user_code: mappingData.user_code || mappingData.user_id,
      user_name: mappingData.user_name || mappingData.user_id,
      user_dt: mappingData.user_dt || new Date(),
    });

    return await repository.save(mapping);
  }

  static async deleteUserRoleMappingsWithTransaction(
    mappings: Array<{
      user_id: string;
      user_role: string;
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(MsPsUserRoleMapping);

      let totalDeleted = 0;

      for (const mapping of mappings) {
        const result = await repository.delete({
          user_id: mapping.user_id,
          user_role: mapping.user_role,
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

  // ==================== USER WITH ROLES METHODS ====================

  static async getUserWithAssignedRoles(
    user_id: string
  ): Promise<SecLoginRoleAccess | null> {
    const repository = getRepository(SecLoginRoleAccess);
    return await repository.findOne({
      where: { user_id },
      relations: ["assignedRoles"], // This loads the related roles
    });
  }

  static async getUserAssignedRolesSimplified(user_id: string): Promise<any[]> {
    const userWithRoles = await this.getUserWithAssignedRoles(user_id);

    if (!userWithRoles || !userWithRoles.assignedRoles) {
      return [];
    }

    return userWithRoles.assignedRoles.map((role) => ({
      user_role: role.user_role,
      role_name: role.role_name,
      user_id: userWithRoles.user_id,
    }));
  }

  // ==================== ROLE WITH USERS METHODS ====================

  static async getRoleWithAssignedUsers(
    user_role: string
  ): Promise<MsRole | null> {
    const repository = getRepository(MsRole);
    return await repository.findOne({
      where: { user_role },
      relations: ["assignedUsers"],
    });
  }

  // ==================== BULK OPERATIONS ====================

  static async createMultipleUserRoleMappingsWithTransaction(
    mappings: Array<{
      user_id: string;
      user_role: string;
      company_code: string;
      user_code?: string;
      user_name?: string;
    }>
  ): Promise<MsPsUserRoleMapping[]> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(MsPsUserRoleMapping);

      // Check for existing mappings
      for (const mapping of mappings) {
        const existing = await repository.findOne({
          where: { user_id: mapping.user_id, user_role: mapping.user_role },
        });
        if (existing) {
          throw new Error(
            `Role ${mapping.user_role} already assigned to user ${mapping.user_id}`
          );
        }
      }

      const mappingEntities = mappings.map((data) =>
        repository.create({
          ...data,
          user_code: data.user_code || data.user_id,
          user_name: data.user_name || data.user_id,
          user_dt: new Date(),
        })
      );

      const savedMappings = await repository.save(mappingEntities);

      await queryRunner.commitTransaction();
      return savedMappings;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== VALIDATION METHODS ====================

  static async validateUserExists(user_id: string): Promise<boolean> {
    const repository = getRepository(SecLoginRoleAccess);
    const count = await repository.count({ where: { user_id } });
    return count > 0;
  }

  static async validateRoleExists(user_role: string): Promise<boolean> {
    const repository = getRepository(MsRole);
    const count = await repository.count({ where: { user_role } });
    return count > 0;
  }

  static async validateUserAndRoleExist(
    user_id: string,
    user_role: string
  ): Promise<{ userExists: boolean; roleExists: boolean }> {
    const [userExists, roleExists] = await Promise.all([
      this.validateUserExists(user_id),
      this.validateRoleExists(user_role),
    ]);

    return { userExists, roleExists };
  }

  // ==================== QUERY METHODS ====================

  static async getUserRoleMappingsByUser(
    user_id: string
  ): Promise<MsPsUserRoleMapping[]> {
    const repository = getRepository(MsPsUserRoleMapping);
    return await repository.find({
      where: { user_id },
    });
  }

  static async getUserRoleMappingsByRole(
    user_role: string
  ): Promise<MsPsUserRoleMapping[]> {
    const repository = getRepository(MsPsUserRoleMapping);
    return await repository.find({
      where: { user_role },
    });
  }
}
