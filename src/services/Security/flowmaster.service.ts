import { getRepository } from "../../database/connection";
import { FlowMaster } from "../../entity/Security/flowmaster.entity";
import { In } from "typeorm";

export class FlowMasterService {
  public static getFlowMasterRepository() {
    return getRepository(FlowMaster);
  }

  static async findByDescriptionAndCompany(
    flow_description: string,
    company_code: string
  ): Promise<FlowMaster | null> {
    const repository = this.getFlowMasterRepository();
    return await repository.findOne({
      where: { flow_description, company_code },
    });
  }

  static async findByFlowCodeAndCompany(
    flow_code: string,
    company_code: string
  ): Promise<FlowMaster | null> {
    const repository = this.getFlowMasterRepository();
    return await repository.findOne({
      where: { flow_code, company_code },
    });
  }

  static async createFlow(flowData: {
    flow_description: string;
    company_code: string;
    created_by: string;
    updated_by: string;
  }): Promise<FlowMaster> {
    const repository = this.getFlowMasterRepository();

    // Generate flow_code (you might want to customize this logic)
    const maxFlowCode = await repository
      .createQueryBuilder("flowMaster")
      .select("MAX(flowMaster.flow_code)", "max")
      .getRawOne();

    let nextFlowCode = "F0001";
    if (maxFlowCode?.max) {
      const currentMax = parseInt(maxFlowCode.max.replace("F", ""));
      nextFlowCode = `F${(currentMax + 1).toString().padStart(4, "0")}`;
    }

    const flow = repository.create({
      ...flowData,
      flow_code: nextFlowCode,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await repository.save(flow);
  }

  static async updateFlow(
    flow_code: string,
    company_code: string,
    updateData: any
  ): Promise<boolean> {
    const repository = this.getFlowMasterRepository();

    const result = await repository.update(
      { flow_code, company_code },
      {
        ...updateData,
        updated_at: new Date(),
      }
    );

    return result.affected ? result.affected > 0 : false;
  }

  static async deleteFlows(flow_codes: string[]): Promise<boolean> {
    const repository = this.getFlowMasterRepository();

    const result = await repository.delete({
      flow_code: In(flow_codes),
    });

    return result.affected ? result.affected > 0 : false;
  }

  static async checkFlowExists(
    flow_code: string,
    company_code: string
  ): Promise<boolean> {
    const repository = this.getFlowMasterRepository();
    const count = await repository.count({
      where: { flow_code, company_code },
    });
    return count > 0;
  }
}
