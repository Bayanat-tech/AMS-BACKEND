import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.MG_REPORT)
export class ReportMaster {
  @PrimaryColumn({ name: "REPORT_NO", type: "number" })
  report_no!: number;

  @Column({ name: "REPORTID", type: "varchar2", length: 200 })
  reportid!: string;

  @Column({ name: "REPORTNAME", type: "varchar2", length: 200 })
  reportname!: string;

  @Column({ name: "MODULE", type: "varchar2", length: 100 })
  module!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 50 })
  company_code!: string;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 50 })
  updated_by!: string;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 20 })
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
