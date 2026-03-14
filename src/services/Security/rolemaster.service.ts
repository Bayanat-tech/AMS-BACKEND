import { getRepository } from "../../database/connection";
import { RoleMaster } from "../../entity/Security/rolemaster.entity";
import { In } from "typeorm";

export class RoleMasterService {
  private static getRoleMasterRepository() {
    return getRepository(RoleMaster);
  }

  static async findByRoleDescAndCompany(
    role_desc: string,
    company_code: string
  ): Promise<RoleMaster | null> {
    const repository = this.getRoleMasterRepository();
    return await repository.findOne({
      where: { role_desc, company_code },
    });
  }

  static async findByRoleIdAndCompany(
    role_id: number,
    company_code: string
  ): Promise<RoleMaster | null> {
    const repository = this.getRoleMasterRepository();
    return await repository.findOne({
      where: { role_id, company_code },
    });
  }

  static async createRole(roleData: {
    role_desc: string;
    remarks: string;
    company_code: string;
    created_by: string;
    updated_by: string;
  }): Promise<RoleMaster> {
    const repository = this.getRoleMasterRepository();

    // Get the next role_id
    const maxRoleId = await repository
      .createQueryBuilder("roleMaster")
      .select("MAX(roleMaster.role_id)", "max")
      .getRawOne();

    const nextRoleId = (maxRoleId?.max || 0) + 1;

    const role = repository.create({
      ...roleData,
      role_id: nextRoleId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await repository.save(role);
  }

  static async updateRole(
    role_id: number,
    company_code: string,
    updateData: any
  ): Promise<boolean> {
    const repository = this.getRoleMasterRepository();

    const result = await repository.update(
      { role_id, company_code },
      {
        ...updateData,
        updated_at: new Date(),
      }
    );

    return result.affected ? result.affected > 0 : false;
  }

  static async deleteRoles(role_ids: number[]): Promise<boolean> {
    const repository = this.getRoleMasterRepository();

    const result = await repository.delete({
      role_id: In(role_ids),
    });

    return result.affected ? result.affected > 0 : false;
  }

  static async checkRoleExists(
    role_id: number,
    company_code: string
  ): Promise<boolean> {
    const repository = this.getRoleMasterRepository();
    const count = await repository.count({
      where: { role_id, company_code },
    });
    return count > 0;
  }
}
