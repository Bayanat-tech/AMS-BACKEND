import { getRepository } from "../database/connection";
import { User } from "../entity/User";
import { Company } from "../entity/Company";
import bcrypt from "bcrypt";
import { oracleDb } from "../database/connection";

// Add interface for API User
interface ExternalApiUser {
  USER_ID: string;
  NAME: string;
  EMAIL?: string;
  TYPE?: string;
  EMPLOYEE_ID?: string;
}

export class AuthService {
  private static getUserRepository() {
    return getRepository(User);
  }

  private static getCompanyRepository() {
    return getRepository(Company);
  }

  // Find user by email or loginid - FIXED for actual column names
  static async findUserByEmailOrLoginId(email: string): Promise<User | null> {
    const userRepository = this.getUserRepository();

    const user = await userRepository
      .createQueryBuilder("user")
      .where("(user.email_id = :email OR user.loginid = :email)", { email })
      .andWhere("user.active_flag = :active", { active: "Y" })
      .getOne();

    return user;
  }

  // Find user by email - FIXED for actual column names
  static async findUserByEmail(email: string): Promise<User | null> {
    const userRepository = this.getUserRepository();
    return await userRepository.findOne({
      where: {
        email_id: email,
        active_flag: "Y",
      },
      relations: ["company"],
    });
  }

  // Simple approach without QueryBuilder
  static async findUserByEmailOrLoginIdSimple(
    email: string
  ): Promise<User | null> {
    const userRepository = this.getUserRepository();

    // Try finding by email first
    let user = await userRepository.findOne({
      where: {
        email_id: email,
        active_flag: "Y",
      },
    });

    // If not found by email, try by loginid
    if (!user) {
      user = await userRepository.findOne({
        where: {
          loginid: email,
          active_flag: "Y",
        },
      });
    }

    return user;
  }

  static async createUserFromExternal(
    apiUser: ExternalApiUser,
    password: string,
    hashedPassword: string
  ): Promise<User> {
    const userRepository = this.getUserRepository();

    const appType =
      typeof apiUser.TYPE === "string" &&
      apiUser.TYPE.toUpperCase() === "EMPLOYEE"
        ? "EMPLOYEE"
        : "VENDOR";

    let syntheticEmail = `${apiUser.USER_ID.toLowerCase()}@gmail.com`;
    if (typeof apiUser.EMAIL === "string" && apiUser.EMAIL.includes("@")) {
      syntheticEmail = apiUser.EMAIL;
    }

    const loginid1Value =
      appType === "VENDOR" ? apiUser.USER_ID : apiUser.EMPLOYEE_ID || "";

    const newUser = new User();
    newUser.company_code = "BSG";
    newUser.email_id = syntheticEmail; 
    newUser.loginid = apiUser.USER_ID;
    newUser.username = apiUser.NAME;
    newUser.userpass = hashedPassword;
    newUser.SEC_PASSWD = hashedPassword;
    newUser.active_flag = "Y";
    newUser.user_code = apiUser.USER_ID;
    newUser.user_id = apiUser.USER_ID;
    newUser.APPLICATION = appType;
    newUser.created_by = "system";
    newUser.updated_by = "system";
    newUser.created_at = new Date();
    newUser.lang_pref = "en";
    newUser.loginid1 = loginid1Value;

    const savedUser = await userRepository.save(newUser);

    const typeStr =
      typeof apiUser.TYPE === "string" ? apiUser.TYPE.toUpperCase() : "";
    const roleId =
      typeStr === "VENDOR" ? 88888 : typeStr === "EMPLOYEE" ? 77777 : null;

    if (roleId !== null) {
      const insertQuery = `
      INSERT INTO SEC_ROLE_FUNCTION_ACCESS_USER (
        COMPANY_CODE, LOGINID, SERIAL_NO_OR_ROLE_ID, SNEW, SMODIFY, SDELETE, SSAVE,
        SSEARCH, SSAVEAS, SUPLOAD, SUNDO, SPRINT, SPRINTSETUP, SHELP, USER_DT, USERID, CREATE_USER, CREATE_DATE
      ) VALUES (
        :company_code, :loginid, :role_id, :snew, :smodify, :sdelete, :ssave,
        :ssearch, :ssaveas, :supload, :sundo, :sprint, :sprintsetup, :shelp, 
        CURRENT_TIMESTAMP, :userid, :create_user, CURRENT_TIMESTAMP
      )
    `;

      const params = {
        company_code: "BSG",
        loginid: apiUser.USER_ID,
        role_id: roleId,
        snew: "Y",
        smodify: "Y",
        sdelete: "Y",
        ssave: "Y",
        ssearch: "Y",
        ssaveas: "Y",
        supload: "Y",
        sundo: "Y",
        sprint: "Y",
        sprintsetup: "Y",
        shelp: "Y",
        userid: apiUser.USER_ID,
        create_user: "system",
      };

      try {
        await this.executeRawQuery(insertQuery, params);
        console.log(
          "Successfully inserted SEC_ROLE_FUNCTION_ACCESS_USER record"
        );
      } catch (err) {
        console.error(
          "Failed to insert SEC_ROLE_FUNCTION_ACCESS_USER record:",
          err
        );
      }
    }

    return savedUser;
  }

  static async updateUserPassword(
    email: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE SEC_LOGIN 
        SET USERPASS = :hashedPassword,
            SEC_PASSWD = :hashedPassword,
            UPDATED_BY = :updated_by
        WHERE EMAIL_ID = :email
      `;

      const params = {
        hashedPassword: hashedPassword,
        updated_by: "system",
        email: email,
      };

      const result = await this.executeRawQuery(updateQuery, params);
      console.log("Password update result:", result);
      
      return true;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }

  // Execute raw queries
  static async executeRawQuery(
    query: string,
    parameters: any = {}
  ): Promise<any[]> {
    try {
      if (Array.isArray(parameters)) {
        parameters = parameters.reduce((acc, val, idx) => {
          acc[`param${idx + 1}`] = val;
          return acc;
        }, {});
      }

      const result = await oracleDb.query(query, parameters);

      return [result.rows || [], result];
    } catch (error) {
      console.error("Query execution error:", error);
      throw error;
    }
  }

  // Compare passwords
  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}
