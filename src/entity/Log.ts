import { Entity, Column, UpdateDateColumn, PrimaryColumn } from "typeorm";

@Entity("M_NOTIFICATION_LOGS")
export class Log {
  @PrimaryColumn({ name: "COMPANY_CODE", type: "varchar2", length: 10 })
  company_code!: string;

  @PrimaryColumn({ name: "LOGINID", type: "varchar2", length: 45 })
  loginid!: string;

  @PrimaryColumn({ name: "MODULE", type: "varchar2", length: 45 })
  module!: string;

  @PrimaryColumn({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  @Column({ name: "DESCRIPTION", type: "varchar2", length: 45 })
  description!: string;

  @Column({ name: "READ_FLAG", type: "varchar2", length: 1 })
  read!: string;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 45 })
  created_by!: string;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 45 })
  updated_by!: string;

  @UpdateDateColumn({ name: "UPDATED_AT" })
  updated_at!: Date;
}
