import { Entity, PrimaryColumn, Column, ManyToMany, JoinTable } from "typeorm";
import constants from "../../helpers/constants";
import { MsRole } from "./msrole.entity";

@Entity(constants.TABLE.SEC_LOGIN)
export class SecLoginRoleAccess {
  @PrimaryColumn({ name: "USER_ID", type: "varchar2", length: 50 })
  user_id!: string;

  @Column({ name: "USERNAME", type: "varchar2", length: 100 })
  username!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 40 })
  company_code!: string;

  @ManyToMany(() => MsRole, (role) => role.assignedUsers)
  @JoinTable({
    name: constants.TABLE.MS_PS_USER_ROLE_MAPPING,
    joinColumn: {
      name: "USER_ID",
      referencedColumnName: "user_id",
    },
    inverseJoinColumn: {
      name: "USER_ROLE",
      referencedColumnName: "user_role",
    },
  })
  assignedRoles!: MsRole[];
}
