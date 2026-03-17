import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  PrimaryColumn,
  OneToMany,
} from "typeorm";
import constants from "../../helpers/constants";
import { EmployeeFace } from "./employee_face.entity";
import { ProxyLog } from "./ProxyLog.entity";
import { AttendanceRecord } from "./attendance_record.entity";
import { AttendanceEvent } from "./attendance_events.entity";

@Entity({ name: constants.TABLE.EMPLOYEES })
@Index(["employee_id", "company_code"], { unique: true })
@Index(["employee_code", "company_code"], { unique: true })
@Index(["company_code"])

export class Employee {
  @PrimaryColumn({ name: "ID", type: "varchar2", length: 36 })
  id!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 5 })
  company_code!: string;

  @Column({ name: "EMPLOYEE_ID", type: "varchar2", length: 20 })
  employee_id!: string;

  @Column({ name: "EMPLOYEE_CODE", type: "varchar2", length: 20 })
  employee_code!: string;

  @Column({ name: "FULL_NAME", type: "varchar2", length: 100 })
  full_name!: string;

  @Column({ name: "EMAIL", type: "varchar2", length: 100 })
  email!: string;

  @Column({ name: "DEPARTMENT", type: "varchar2", length: 50 })
  department!: string;

  @Column({ name: "POSITION", type: "varchar2", length: 50 })
  position!: string;

  @Column({ name: "HIRE_DATE", type: "timestamp", nullable: true })
  hire_date!: Date | null;

  @Column({ name: "PHONE_NUMBER", type: "varchar2", length: 20, nullable: true })
  phone_number!: string | null;

  @Column({ name: "IS_ACTIVE", type: "number", precision: 1 , default: "true"})
 is_active!: 1 | 0;

  @Column({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  @Column({ name: "UPDATED_AT", type: "timestamp" })
  updated_at!: Date;

  // Relations

 // Employee -> AttendanceRecord
  @OneToMany(() => AttendanceRecord, record => record.employee)
  attendanceRecords!: AttendanceRecord[];

  // Employee -> AttendanceEvent
  @OneToMany(() => AttendanceEvent, event => event.employee)
  attendanceEvents!: AttendanceEvent[];

  // Employee -> EmployeeFace
  @OneToMany(() => EmployeeFace, face => face.employee)
  employeeFaces!: EmployeeFace[];

  // Employee -> ProxyLog (proxy employee)
  @OneToMany(() => ProxyLog, log => log.proxyEmployee)
  proxyLogsAsProxy!: ProxyLog[];

  // Employee -> ProxyLog (actual employee)
  @OneToMany(() => ProxyLog, log => log.actualEmployee)
  proxyLogsAsActual!: ProxyLog[];

}


