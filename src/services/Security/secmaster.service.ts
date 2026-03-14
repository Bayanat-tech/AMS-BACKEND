import { getRepository } from "../../database/connection";
import { User } from "../../entity/Security/User";
import * as bcrypt from "bcrypt";
import { Not } from "typeorm";

export class SecmasterService {
  private static getUserRepository() {
    return getRepository(User);
  }

  static async findByEmailAndCompany(
    email_id: string,
    company_code: string
  ): Promise<User | null> {
    const userRepository = this.getUserRepository();
    return await userRepository.findOne({
      where: { email_id, company_code },
    });
  }

  static async findByIdAndCompany(
    id: number,
    company_code: string,
    loginid: string,
    email_id: string
  ): Promise<User | null> {
    const userRepository = this.getUserRepository();
    return await userRepository.findOne({
      where: { loginid: loginid, company_code, id, email_id },
    });
  }

  static async checkDuplicateUser(params: {
    company_code: string;
    contact_no: string;
    email_id: string;
    username: string;
  }): Promise<User | null> {
    const userRepository = this.getUserRepository();
    return await userRepository.findOne({
      where: {
        company_code: params.company_code,
        contact_no: params.contact_no,
        email_id: params.email_id,
        username: params.username,
      },
    });
  }

  static async createUser(userData: {
    company_code: string;
    contact_no: string;
    email_id: string;
    username: string;
    userpass: string;
    active_flag: string;
    created_by: string;
    updated_by: string;
  }): Promise<User> {
    const userRepository = this.getUserRepository();
    const hashedPassword = await bcrypt.hash(userData.userpass, 12);

    const user = userRepository.create({
      ...userData,
      userpass: hashedPassword,
      SEC_PASSWD: hashedPassword,
      loginid: userData.username,
      user_id: userData.username,
      user_code: userData.username,
      created_at: new Date(),
    });

    return await userRepository.save(user);
  }

  static async updateUser(
    loginid: string,
    id: number,
    company_code: string,
    email_id: string,
    updateData: any
  ): Promise<boolean> {
    const userRepository = this.getUserRepository();

    
    if (updateData.userpass) {
      updateData.userpass = await bcrypt.hash(updateData.userpass, 12);
      updateData.SEC_PASSWD = updateData.userpass;
    }
 
    if ("id" in updateData) {
      delete updateData.id;
    }

    const result = await userRepository.update(
      { loginid: loginid, company_code, id, email_id },
      { ...updateData }
    );

    return result.affected ? result.affected > 0 : false;
  }

  static async checkEmailExistsExcludingCurrent(
    email_id: string,
    company_code: string,
    excludeLoginid: string
  ): Promise<User | null> {
    const userRepository = this.getUserRepository();
    return await userRepository.findOne({
      where: {
        email_id,
        company_code,
        loginid: Not(excludeLoginid),
      },
    });
  }
}
