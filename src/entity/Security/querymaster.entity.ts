import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.TBL_SQL_STRING_INFO)
export class QueryMaster {
  @PrimaryColumn({ name: "SR_NO", type: "number" })
  sr_no!: number;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 30 })
  company_code!: string;

  @Column({ name: "PARAMETER", type: "varchar2", length: 500 })
  parameter!: string;

  @Column({ name: "SQL_STRING", type: "varchar2", length: 1000 })
  sql_string!: string;

  @Column({ name: "STRING1", type: "varchar2", length: 500, nullable: true })
  string1!: string;

  @Column({ name: "STRING2", type: "varchar2", length: 500, nullable: true })
  string2!: string;

  @Column({ name: "STRING3", type: "varchar2", length: 500, nullable: true })
  string3!: string;

  @Column({ name: "STRING4", type: "varchar2", length: 500, nullable: true })
  string4!: string;

  @Column({ name: "ORDER_BY", type: "varchar2", length: 500, nullable: true })
  order_by!: string;

  @Column({ name: "USTRING1", type: "varchar2", length: 500, nullable: true })
  ustring1!: string;

  @Column({ name: "USTRING2", type: "varchar2", length: 500, nullable: true })
  ustring2!: string;

  @Column({ name: "USTRING3", type: "varchar2", length: 500, nullable: true })
  ustring3!: string;

  @Column({ name: "USTRING4", type: "varchar2", length: 500, nullable: true })
  ustring4!: string;

  @Column({ name: "USTRING5", type: "varchar2", length: 500, nullable: true })
  ustring5!: string;

  @Column({ name: "USTRING6", type: "varchar2", length: 500, nullable: true })
  ustring6!: string;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 50 })
  updated_by!: string;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 50 })
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
