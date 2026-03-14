import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.SEC_MODULE_DATA)
export class SecModule {
  @PrimaryColumn({ name: "SERIAL_NO", type: "number" })
  serial_no!: number;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 20 })
  company_code!: string;

  @Column({ name: "APP_CODE", type: "varchar2", length: 30 })
  app_code!: string;

  @Column({ name: "LEVEL1", type: "varchar2", length: 50 })
  level1!: string;

  @Column({ name: "LEVEL2", type: "varchar2", length: 50, nullable: true })
  level2!: string;

  @Column({ name: "LEVEL3", type: "varchar2", length: 50, nullable: true })
  level3!: string;

  @Column({ name: "POSITION", type: "number", nullable: true })
  position!: number;

  @Column({ name: "URL_PATH", type: "varchar2", length: 1000, nullable: true })
  url_path!: string;

  @Column({ name: "ICON", type: "varchar2", length: 100, nullable: true })
  icon!: string;

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

  @Column({ name: "USER_DT", type: "date", nullable: true })
  user_dt!: Date;

  @Column({ name: "USERID", type: "varchar2", length: 50, nullable: true })
  userid!: string;

  @Column({ name: "CREATE_USER", type: "varchar2", length: 50, nullable: true })
  create_user!: string;

  @Column({ name: "CREATE_DATE", type: "date", nullable: true })
  create_date!: Date;

  @Column({ name: "HISTORY_SERIAL", type: "number", nullable: true })
  history_serial!: number;
}
