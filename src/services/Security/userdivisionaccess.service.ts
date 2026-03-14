import { AppDataSource, getRepository } from "../../database/connection";
import { SecLoginUserDivision } from "../../entity/Security/seclogin-usertodivision.entity";
import { MSHRDivisionMaster } from "../../entity/Security//mshrdivisionmaster.entity";
import { MSCompanyUserAssign } from "../../entity/Security/mscompanyuserassign.entity";

export class UserDivisionAccessService {
  // ==================== USER DIVISION ASSIGNMENT METHODS ====================

  static async createUserDivisionAssignment(assignmentData: {
    user_id: string;
    div_code: string;
    divn_code?: string;
  }): Promise<MSCompanyUserAssign> {
    const repository = getRepository(MSCompanyUserAssign);

    // Check if assignment already exists
    const existingAssignment = await repository.findOne({
      where: {
        user_id: assignmentData.user_id,
        div_code: assignmentData.div_code,
      },
    });

    if (existingAssignment) {
      throw new Error("Division already assigned to this user");
    }

    const assignment = repository.create({
      ...assignmentData,
      divn_code: assignmentData.divn_code || assignmentData.div_code,
    });

    return await repository.save(assignment);
  }

  static async deleteUserDivisionAssignmentsWithTransaction(
    assignments: Array<{
      user_id: string;
      div_code: string;
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(MSCompanyUserAssign);

      let totalDeleted = 0;

      for (const assignment of assignments) {
        const result = await repository.delete({
          user_id: assignment.user_id,
          div_code: assignment.div_code,
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

  // ==================== USER WITH DIVISIONS METHODS ====================

  static async getUserWithAssignedDivisions(
    user_id: string
  ): Promise<SecLoginUserDivision | null> {
    const repository = getRepository(SecLoginUserDivision);
    return await repository.findOne({
      where: { user_id },
      relations: ["assignedDivisions"], // This loads the related divisions
    });
  }

  static async getUserAssignedDivisionsSimplified(
    user_id: string
  ): Promise<any[]> {
    const userWithDivisions = await this.getUserWithAssignedDivisions(user_id);

    if (!userWithDivisions || !userWithDivisions.assignedDivisions) {
      return [];
    }

    return userWithDivisions.assignedDivisions.map((division) => ({
      div_code: division.div_code,
      div_name: division.div_name,
      user_id: userWithDivisions.user_id,
    }));
  }

  // ==================== DIVISION WITH USERS METHODS ====================

  static async getDivisionWithAssignedUsers(
    div_code: string
  ): Promise<MSHRDivisionMaster | null> {
    const repository = getRepository(MSHRDivisionMaster);
    return await repository.findOne({
      where: { div_code },
      relations: ["assignedUsers"],
    });
  }

  // ==================== BULK OPERATIONS ====================

  static async createMultipleUserDivisionAssignmentsWithTransaction(
    assignments: Array<{
      user_id: string;
      div_code: string;
      divn_code?: string;
    }>
  ): Promise<MSCompanyUserAssign[]> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(MSCompanyUserAssign);

      // Check for existing assignments
      for (const assignment of assignments) {
        const existing = await repository.findOne({
          where: { user_id: assignment.user_id, div_code: assignment.div_code },
        });
        if (existing) {
          throw new Error(
            `Division ${assignment.div_code} already assigned to user ${assignment.user_id}`
          );
        }
      }

      const assignmentEntities = assignments.map((data) =>
        repository.create({
          ...data,
          divn_code: data.divn_code || data.div_code,
        })
      );

      const savedAssignments = await repository.save(assignmentEntities);

      await queryRunner.commitTransaction();
      return savedAssignments;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== VALIDATION METHODS ====================

  static async validateUserExists(user_id: string): Promise<boolean> {
    const repository = getRepository(SecLoginUserDivision);
    const count = await repository.count({ where: { user_id } });
    return count > 0;
  }

  static async validateDivisionExists(div_code: string): Promise<boolean> {
    const repository = getRepository(MSHRDivisionMaster);
    const count = await repository.count({ where: { div_code } });
    return count > 0;
  }

  static async validateUserAndDivisionExist(
    user_id: string,
    div_code: string
  ): Promise<{ userExists: boolean; divisionExists: boolean }> {
    const [userExists, divisionExists] = await Promise.all([
      this.validateUserExists(user_id),
      this.validateDivisionExists(div_code),
    ]);

    return { userExists, divisionExists };
  }

  // ==================== QUERY METHODS ====================

  static async getUserDivisionAssignmentsByUser(
    user_id: string
  ): Promise<MSCompanyUserAssign[]> {
    const repository = getRepository(MSCompanyUserAssign);
    return await repository.find({
      where: { user_id },
    });
  }

  static async getUserDivisionAssignmentsByDivision(
    div_code: string
  ): Promise<MSCompanyUserAssign[]> {
    const repository = getRepository(MSCompanyUserAssign);
    return await repository.find({
      where: { div_code },
    });
  }

  // ==================== UPDATE METHODS ====================

  static async updateUserDivisionAssignment(
    user_id: string,
    div_code: string,
    updateData: Partial<{
      divn_code: string;
    }>
  ): Promise<boolean> {
    const repository = getRepository(MSCompanyUserAssign);
    const result = await repository.update({ user_id, div_code }, updateData);
    return result.affected ? result.affected > 0 : false;
  }
}
