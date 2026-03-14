import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.MS_COMPANY_USER_ASSIGN)
export class MSCompanyUserAssign {
  @PrimaryColumn({ name: "USER_ID", type: "varchar2", length: 50 })
  user_id!: string;

  @PrimaryColumn({ name: "DIV_CODE", type: "varchar2", length: 50 })
  div_code!: string;

  @Column({ name: "DIVN_CODE", type: "varchar2", length: 50 })
  divn_code!: string;
}
