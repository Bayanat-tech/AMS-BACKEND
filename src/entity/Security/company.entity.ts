import { Entity, PrimaryColumn, Column } from "typeorm";
import constants from "../../helpers/constants";

@Entity(constants.TABLE.MS_COMPANY)
export class Company {
  @PrimaryColumn({ name: "COMPANY_CODE", type: "varchar2", length: 7 })
  company_code!: string;

  @Column({ name: "COMPANY_NAME", type: "varchar2", length: 30 })
  company_name!: string;

  @Column({ name: "ADDRESS1", type: "varchar2", length: 20, nullable: true })
  address1!: string;

  @Column({ name: "ADDRESS2", type: "varchar2", length: 20, nullable: true })
  address2!: string;

  @Column({ name: "ADDRESS3", type: "varchar2", length: 20, nullable: true })
  address3!: string;

  @Column({ name: "CITY", type: "varchar2", length: 20, nullable: true })
  city!: string;

  @Column({ name: "COUNTRY", type: "varchar2", length: 5, nullable: true })
  country!: string;

  // @Column({
  //   name: "STMT_OF_ACCOUNTS",
  //   type: "varchar2",
  //   length: 500,
  //   nullable: true,
  // })
  // stmt_of_accounts!: string;

  // @Column({
  //   name: "APP_LICENSE_001",
  //   type: "varchar2",
  //   length: 30,
  //   nullable: true,
  // })
  // app_license_001!: string;

  // @Column({ name: "PICKING_PATH", type: "clob", nullable: true })
  // picking_path!: string;

  // @Column({
  //   name: "MAIL_SERVER",
  //   type: "varchar2",
  //   length: 250,
  //   nullable: true,
  // })
  // mail_server!: string;

  // @Column({ name: "MAIL_EMAIL", type: "varchar2", length: 250, nullable: true })
  // mail_email!: string;

  // @Column({ name: "MAIL_PWD", type: "varchar2", length: 50, nullable: true })
  // mail_pwd!: string;

  // @Column({
  //   name: "BILL_AUTH_PWD",
  //   type: "varchar2",
  //   length: 20,
  //   nullable: true,
  // })
  // bill_auth_pwd!: string;

  @Column({ name: "UPDATED_AT", type: "timestamp", nullable: true })
  updated_at!: Date;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 50, nullable: true })
  updated_by!: string;

  @Column({ name: "CREATED_AT", type: "timestamp", nullable: true })
  created_at!: Date;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 50, nullable: true })
  created_by!: string;

  // @Column({
  //   name: "COMPANY_LOGO",
  //   type: "varchar2",
  //   length: 225,
  //   nullable: true,
  // })
  // company_logo!: string;

  // @Column({
  //   name: "COMPANY_LOGO_AWSURL",
  //   type: "varchar2",
  //   length: 500,
  //   nullable: true,
  // })
  // company_logo_awsurl!: string;

  // @Column({
  //   name: "CONTACT_NUMBER",
  //   type: "varchar2",
  //   length: 30,
  //   nullable: true,
  // })
  // contact_number!: string;
}
