import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.SEC_LOGIN)
export class User {
  @PrimaryColumn({ name: "LOGINID", type: "varchar2", length: 50 })
  loginid!: string;
  @PrimaryColumn({ name: "ID", type: "number" })
  id!: number;

  @PrimaryColumn({ name: "EMAIL_ID", type: "varchar2", length: 400 })
  email_id!: string;

  @Column({ name: "USERNAME", type: "varchar2", length: 400 })
  username!: string;

  @Column({
    name: "CONTACT_NAME",
    type: "varchar2",
    length: 100,
    nullable: true,
  })
  contact_name!: string;

  @Column({ name: "CONTACT_NO", type: "varchar2", length: 100, nullable: true })
  contact_no!: string;

  @Column({
    name: "CONTACT_EMAIL",
    type: "varchar2",
    length: 1000,
    nullable: true,
  })
  contact_email!: string;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 50 })
  updated_by!: string;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 20 })
  created_by!: string;

  @Column({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  @Column({ name: "USERPASS", type: "varchar2", length: 200 })
  userpass!: string;

  @Column({ name: "SEC_PASSWD", type: "varchar2", length: 200 })
  SEC_PASSWD!: string;

  @Column({ name: "NO_OF_DAYS", type: "number", nullable: true })
  no_of_days!: number;

  @Column({ name: "ACTIVE_FLAG", type: "char", length: 1 })
  active_flag!: string;

  @Column({ name: "LANG_PREF", type: "varchar2" })
  lang_pref!: string;

  @Column({ name: "APPLICATION", type: "varchar2", length: 30, nullable: true })
  APPLICATION!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2" })
  company_code!: string;

  // ADD MISSING FIELDS:
  @Column({ name: "USER_CODE", type: "varchar2", length: 50, nullable: true })
  user_code!: string;

  @Column({ name: "USER_ID", type: "varchar2", length: 50, nullable: true })
  user_id!: string;
}
