import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import constants from "../helpers/constants";
import { User } from "./User";

@Entity(constants.TABLE.MS_COMPANY)
export class Company {
  @PrimaryColumn({ name: "COMPANY_CODE", type: "varchar2", length: 5 })
  company_code!: string;

  @Column({ name: "COMPANY_NAME", type: "varchar2", length: 50 })
  company_name!: string;

  @Column({ name: "ADDRESS1", type: "varchar2", length: 50, nullable: true })
  address1!: string;

  @Column({ name: "ADDRESS2", type: "varchar2", length: 50, nullable: true })
  address2!: string;

  @Column({ name: "ADDRESS3", type: "varchar2", length: 50, nullable: true })
  address3!: string;

  @Column({ name: "CITY", type: "varchar2", length: 50, nullable: true })
  city!: string;

  @Column({ name: "COUNTRY", type: "varchar2", length: 50, nullable: true })
  country!: string;

  @Column({
    name: "BL_SECTION_1",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  bl_section_1!: string;

  @Column({
    name: "BL_SECTION_2",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  bl_section_2!: string;

  @Column({
    name: "STMT_OF_ACCOUNTS",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  stmt_of_accounts!: string;

  @Column({
    name: "APP_LICENSE_001",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  app_license_001!: string;

  @Column({
    name: "PICKING_PATH",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  picking_path!: string;

  @Column({ name: "MAIL_SERVER", type: "varchar2", length: 50, nullable: true })
  mail_server!: string;

  @Column({ name: "MAIL_EMAIL", type: "varchar2", length: 50, nullable: true })
  mail_email!: string;

  @Column({ name: "MAIL_PWD", type: "varchar2", length: 50, nullable: true })
  mail_pwd!: string;

  @Column({
    name: "BILL_AUTH_PWD",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  bill_auth_pwd!: string;

  @Column({
    name: "COMPANY_LOGO",
    type: "varchar2",
    length: 225,
    nullable: true,
  })
  company_logo!: string;

  // User relationship (inverse side)
  @OneToMany(() => User, (user) => user.company)
  users!: User[];
}
