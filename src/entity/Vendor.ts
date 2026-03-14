import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity({ name: "MS_VENDOR" })
export class Vendor {
  @PrimaryColumn({ name: "COMPANY_CODE", type: "varchar2", length: 10 })
  COMPANY_CODE: string;

  @Column({ name: "AC_CODE", type: "varchar2", length: 3, nullable: true })
  AC_CODE?: string;

  @PrimaryColumn({ name: "VENDOR_CODE", type: "varchar2", length: 10 })
  VENDOR_CODE: string;

  @Column({ name: "CURR_CODE", type: "varchar2", length: 3, nullable: true })
  CURR_CODE?: string;

  @Column({ name: "CR_NUMBER", type: "varchar2", length: 30, nullable: true })
  CR_NUMBER?: string;

  @Column({ name: "COUNTRY_CODE", type: "varchar2", length: 5, nullable: true })
  COUNTRY_CODE?: string;

  @Column({ name: "VENDOR_NAME", type: "varchar2", length: 50, nullable: true })
  VENDOR_NAME?: string;

  @Column({
    name: "VENDOR_ADDR1",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_ADDR1?: string;

  @Column({
    name: "VENDOR_ADDR2",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_ADDR2?: string;

  @Column({
    name: "VENDOR_ADDR3",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_ADDR3?: string;

  @Column({
    name: "VENDOR_ADDR4",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_ADDR4?: string;

  @Column({ name: "VENDOR_CITY", type: "varchar2", length: 50, nullable: true })
  VENDOR_CITY?: string;

  @Column({
    name: "VENDOR_CONTACT1",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_CONTACT1?: string;

  @Column({
    name: "VENDOR_TELNO1",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_TELNO1?: string;

  @Column({
    name: "VENDOR_FAXNO1",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_FAXNO1?: string;

  @Column({
    name: "VENDOR_EMAIL1",
    type: "varchar2",
    length: 200,
    nullable: true,
  })
  VENDOR_EMAIL1?: string;

  @Column({
    name: "VENDOR_CONTACT2",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_CONTACT2?: string;

  @Column({
    name: "VENDOR_TELNO2",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_TELNO2?: string;

  @Column({
    name: "VENDOR_FAXNO2",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_FAXNO2?: string;

  @Column({
    name: "VENDOR_EMAIL2",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_EMAIL2?: string;

  @Column({
    name: "VENDOR_CONTACT3",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_CONTACT3?: string;

  @Column({
    name: "VENDOR_TELNO3",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_TELNO3?: string;

  @Column({
    name: "VENDOR_FAXNO3",
    type: "varchar2",
    length: 50,
    nullable: true,
  })
  VENDOR_FAXNO3?: string;

  @Column({ name: "VENDOR_REF1", type: "varchar2", length: 50, nullable: true })
  VENDOR_REF1?: string;

  @Column({ name: "VENDOR_REF2", type: "varchar2", length: 50, nullable: true })
  VENDOR_REF2?: string;

  @Column({ name: "VENDOR_REF3", type: "varchar2", length: 50, nullable: true })
  VENDOR_REF3?: string;

  @Column({ name: "SERVICE_DATE", type: "date", nullable: true })
  SERVICE_DATE?: Date;

  @Column({ name: "SECLOGINID", type: "varchar2", length: 20, nullable: true })
  SECLOGINID?: string;
}
