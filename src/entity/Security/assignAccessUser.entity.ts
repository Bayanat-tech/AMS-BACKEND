import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";


@Entity(constants.TABLE.SEC_LOGIN)
export class AccessUserSecMaster {
  @PrimaryColumn({ name: "LOGINID", type: "varchar2", length: 50 })
  loginid!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 20 })
  company_code!: string;

  @Column({ name: "USERNAME", type: "varchar2", length: 400 })
  username!: string;
}