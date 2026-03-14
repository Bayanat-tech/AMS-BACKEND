import { getRepository } from "../../database/connection";
import { Company } from "../../entity/Security/company.entity";

export class CompanyService {
  private static getCompanyRepository() {
    return getRepository(Company);
  }

  static async findDuplicate(params: {
    company_code: string;
    company_name: string;
    address1: string;
    address2: string;
    address3: string;
    city: string;
    country: string;
  }): Promise<Company | null> {
    const repository = this.getCompanyRepository();
    return await repository.findOne({
      where: {
        company_code: params.company_code,
        company_name: params.company_name,
        address1: params.address1,
        address2: params.address2,
        address3: params.address3,
        city: params.city,
        country: params.country,
      },
    });
  }

  static async findByCompanyCode(
    company_code: string
  ): Promise<Company | null> {
    const repository = this.getCompanyRepository();
    return await repository.findOne({
      where: { company_code },
    });
  }

  static async createCompany(companyData: {
    company_code: string;
    company_name: string;
    address1: string;
    address2: string;
    address3: string;
    city: string;
    country: string;
    created_by: string;
    updated_by: string;
  }): Promise<Company> {
    const repository = this.getCompanyRepository();

    const company = repository.create({
      ...companyData,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await repository.save(company);
  }

  static async updateCompany(
    company_code: string,
    updateData: any
  ): Promise<boolean> {
    const repository = this.getCompanyRepository();

    const result = await repository.update(
      { company_code },
      {
        ...updateData,
        updated_at: new Date(),
      }
    );

    return result.affected ? result.affected > 0 : false;
  }

  static async checkCompanyExists(company_code: string): Promise<boolean> {
    const repository = this.getCompanyRepository();
    const count = await repository.count({
      where: { company_code },
    });
    return count > 0;
  }
}
