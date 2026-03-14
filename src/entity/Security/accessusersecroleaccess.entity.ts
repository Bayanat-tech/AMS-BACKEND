import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.SEC_ROLE_FUNCTION_ACCESS_USER)
export class AccessUserSecRoleAccess {
  @PrimaryColumn({ name: "SERIAL_NO_OR_ROLE_ID", type: "number" })
  serial_no_or_role_id!: number;

  @Column({ name: "LOGINID", type: "varchar2", length: 50 })
  loginid!: string;

  @Column({ name: "SNEW", type: "varchar2", length: 5 })
  snew!: string;

  @Column({ name: "SMODIFY", type: "varchar2", length: 5 })
  smodify!: string;

  @Column({ name: "SDELETE", type: "varchar2", length: 5 })
  sdelete!: string;

  @Column({ name: "SSAVE", type: "varchar2", length: 5 })
  ssave!: string;

  @Column({ name: "SSEARCH", type: "varchar2", length: 5 })
  ssearch!: string;

  @Column({ name: "SSAVEAS", type: "varchar2", length: 5 })
  ssaveas!: string;

  @Column({ name: "SUPLOAD", type: "varchar2", length: 5 })
  supload!: string;

  @Column({ name: "SUNDO", type: "varchar2", length: 5 })
  sundo!: string;

  @Column({ name: "SPRINT", type: "varchar2", length: 5 })
  sprint!: string;

  @Column({ name: "SPRINTSETUP", type: "varchar2", length: 5 })
  sprintsetup!: string;

  @Column({ name: "SHELP", type: "varchar2", length: 5 })
  shelp!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 10 })
  company_code!: string;
}
