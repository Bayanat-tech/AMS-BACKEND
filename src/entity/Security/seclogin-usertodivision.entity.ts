import { Entity, PrimaryColumn, Column, ManyToMany, JoinTable } from "typeorm";
import constants from "../../helpers/constants";
import { MSHRDivisionMaster } from "./mshrdivisionmaster.entity";

@Entity(constants.TABLE.SEC_LOGIN)
export class SecLoginUserDivision {
  @PrimaryColumn({ name: "USER_ID", type: "varchar2", length: 50 })
  user_id!: string;

  @Column({ name: "USERNAME", type: "varchar2", length: 100 })
  username!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 40 })
  company_code!: string;

  @ManyToMany(() => MSHRDivisionMaster, (division) => division.assignedUsers)
  @JoinTable({
    name: constants.TABLE.MS_COMPANY_USER_ASSIGN,
    joinColumn: {
      name: "USER_ID",
      referencedColumnName: "user_id",
    },
    inverseJoinColumn: {
      name: "DIV_CODE",
      referencedColumnName: "div_code",
    },
  })
  assignedDivisions!: MSHRDivisionMaster[];
}
