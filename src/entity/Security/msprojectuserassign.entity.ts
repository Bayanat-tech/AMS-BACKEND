import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.MS_PROJECT_USER_ASSIGN)
export class MSProjectUserAssign {
  @PrimaryColumn({ name: "USER_ID", type: "varchar2", length: 50 })
  user_id!: string;

  @PrimaryColumn({ name: "PROJECT_CODE", type: "varchar2", length: 50 })
  project_code!: string;
}
