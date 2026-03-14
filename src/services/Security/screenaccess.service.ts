import { AppDataSource, getRepository } from "../../database/connection";
import { SecLogin } from "../../entity/Security/seclogin.entity";
import { MSPSProjectMaster } from "../../entity/Security/mspsprojectmaster.entity";
import { MSProjectUserAssign } from "../../entity/Security/msprojectuserassign.entity";

export class ScreenAccessService {
  // ==================== PROJECT USER ASSIGNMENT METHODS ====================

  static async createProjectUserAssignment(
    user_id: string,
    project_code: string
  ): Promise<MSProjectUserAssign> {
    const repository = getRepository(MSProjectUserAssign);

    const existingAssignment = await repository.findOne({
      where: { user_id, project_code },
    });

    if (existingAssignment) {
      throw new Error("Project already assigned to this user");
    }

    const assignment = repository.create({ user_id, project_code });
    return await repository.save(assignment);
  }

  static async deleteProjectUserAssignmentsWithTransaction(
    assignments: Array<{
      user_id: string;
      project_code: string;
    }>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(MSProjectUserAssign);

      let totalDeleted = 0;

      for (const assignment of assignments) {
        const result = await repository.delete({
          user_id: assignment.user_id,
          project_code: assignment.project_code,
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

  // ==================== USER WITH PROJECTS METHODS ====================

  static async getUserWithAssignedProjects(
    user_id: string
  ): Promise<SecLogin | null> {
    const repository = getRepository(SecLogin);
    return await repository.findOne({
      where: { user_id },
      relations: ["assignedProjects"],
    });
  }

  static async getUserAssignedProjectsSimplified(
    user_id: string
  ): Promise<any[]> {
    const userWithProjects = await this.getUserWithAssignedProjects(user_id);

    if (!userWithProjects || !userWithProjects.assignedProjects) {
      return [];
    }

    return userWithProjects.assignedProjects.map((project) => ({
      project_code: project.project_code,
      project_name: project.project_name,
      user_id: userWithProjects.user_id,
    }));
  }

  // ==================== PROJECT WITH USERS METHODS ====================

  static async getProjectWithAssignedUsers(
    project_code: string
  ): Promise<MSPSProjectMaster | null> {
    const repository = getRepository(MSPSProjectMaster);
    return await repository.findOne({
      where: { project_code },
      relations: ["assignedUsers"],
    });
  }

  // ==================== BULK OPERATIONS ====================

  static async createMultipleProjectAssignmentsWithTransaction(
    assignments: Array<{
      user_id: string;
      project_code: string;
    }>
  ): Promise<MSProjectUserAssign[]> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repository = queryRunner.manager.getRepository(MSProjectUserAssign);

      // Check for existing assignments
      for (const assignment of assignments) {
        const existing = await repository.findOne({
          where: {
            user_id: assignment.user_id,
            project_code: assignment.project_code,
          },
        });
        if (existing) {
          throw new Error(
            `Project ${assignment.project_code} already assigned to user ${assignment.user_id}`
          );
        }
      }

      const assignmentEntities = assignments.map((data) =>
        repository.create(data)
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
    const repository = getRepository(SecLogin);
    const count = await repository.count({ where: { user_id } });
    return count > 0;
  }

  static async validateProjectExists(project_code: string): Promise<boolean> {
    const repository = getRepository(MSPSProjectMaster);
    const count = await repository.count({ where: { project_code } });
    return count > 0;
  }

  static async validateUserAndProjectExist(
    user_id: string,
    project_code: string
  ): Promise<{ userExists: boolean; projectExists: boolean }> {
    const [userExists, projectExists] = await Promise.all([
      this.validateUserExists(user_id),
      this.validateProjectExists(project_code),
    ]);

    return { userExists, projectExists };
  }
}
