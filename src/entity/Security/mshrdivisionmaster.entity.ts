import { Entity, PrimaryColumn, Column, ManyToMany } from "typeorm";
import constants from "../../helpers/constants";
import { SecLoginUserDivision } from "./seclogin-usertodivision.entity";

@Entity(constants.TABLE.MS_HR_DIVISION)
export class MSHRDivisionMaster {
  @PrimaryColumn({ name: "DIV_CODE", type: "varchar2", length: 50 })
  div_code!: string;

  @Column({ name: "DIV_NAME", type: "varchar2", length: 100, nullable: true })
  div_name!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 50 })
  company_code!: string;

  @ManyToMany(() => SecLoginUserDivision, (user) => user.assignedDivisions)
  assignedUsers!: SecLoginUserDivision[];
}
