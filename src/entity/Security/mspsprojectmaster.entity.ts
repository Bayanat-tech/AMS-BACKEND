import { Entity, PrimaryColumn, Column, ManyToMany } from "typeorm";
import constants from "../../helpers/constants";
import { SecLogin } from "./seclogin.entity";

@Entity(constants.TABLE.MS_PS_PROJECT_MASTER)
export class MSPSProjectMaster {
  @PrimaryColumn({ name: "PROJECT_CODE", type: "varchar2", length: 50 })
  project_code!: string;

  @Column({ name: "PROJECT_NAME", type: "varchar2", length: 100 })
  project_name!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 50 })
  company_code!: string;

  @ManyToMany(() => SecLogin, (user) => user.assignedProjects)
  assignedUsers!: SecLogin[];
}
