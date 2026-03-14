import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.SEC_ROLE_MASTER)
export class RoleMaster {
  @PrimaryColumn({ name: "ROLE_ID", type: "number" })
  role_id!: number;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 20 })
  company_code!: string;

  @Column({ name: "ROLE_DESC", type: "varchar2", length: 100 })
  role_desc!: string;

  @Column({ name: "REMARKS", type: "varchar2", length: 100, nullable: true })
  remarks!: string;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 50, nullable: true })
  updated_by!: string;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 20, nullable: true })
  created_by!: string;

  @Column({
    name: "CREATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at!: Date;

  @Column({
    name: "UPDATED_AT",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  updated_at!: Date;
}
