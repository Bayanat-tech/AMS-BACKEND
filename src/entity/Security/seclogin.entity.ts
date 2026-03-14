import { Entity, PrimaryColumn, Column, ManyToMany, JoinTable } from "typeorm";
import constants from "../../helpers/constants";
import { MSPSProjectMaster } from "./mspsprojectmaster.entity";

@Entity(constants.TABLE.SEC_LOGIN)
export class SecLogin {
  @PrimaryColumn({ name: "USER_ID", type: "varchar2", length: 50 })
  user_id!: string;

  @Column({ name: "USERNAME", type: "varchar2", length: 100 })
  username!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 40 })
  company_code!: string;

  @ManyToMany(() => MSPSProjectMaster, (project) => project.assignedUsers)
  @JoinTable({
    name: constants.TABLE.MS_PROJECT_USER_ASSIGN,
    joinColumn: {
      name: "USER_ID",
      referencedColumnName: "user_id",
    },
    inverseJoinColumn: {
      name: "PROJECT_CODE",
      referencedColumnName: "project_code",
    },
  })
  assignedProjects!: MSPSProjectMaster[];
}
