import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.MS_PS_USER_ROLE_MAPPING)
export class MsPsUserRoleMapping {
  @PrimaryColumn({ name: "USER_ROLE", type: "varchar2", length: 100 })
  user_role!: string;

  @PrimaryColumn({ name: "USER_ID", type: "varchar2", length: 50 })
  user_id!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 10 })
  company_code!: string;

  @Column({ name: "USER_CODE", type: "varchar2", length: 50, nullable: true })
  user_code!: string;

  @Column({ name: "USER_DT", type: "timestamp" })
  user_dt!: Date;

  @Column({ name: "USER_NAME", type: "varchar2", length: 50, nullable: true })
  user_name!: string;
}
