import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import constants from "../../helpers/constants";
import { AttendanceEvent } from "./attendance_events.entity";
import { Employee } from "./employee.entity";

@Entity({ name: constants.TABLE.ATTENDANCE_RECORDS })
export class AttendanceRecord {
  // @PrimaryColumn("uuid")
  @PrimaryColumn({ name: "ID", type: "varchar2", length: 36 })
  id!: string;

  @Column({ name: "EMPLOYEE_ID", type: "varchar2", length: 20 })
  employee_id!: string;

  @Column({ name: "EMPLOYEE_CODE", type: "varchar2", length: 40 })
  employee_code!: string;

  @Column({ name: "RECORD_DATE", type: "date" })
  record_date!: Date;

  @Column({ name: "FIRST_CHECK_IN", type: "timestamp", nullable: true })
  first_check_in!: Date | null;

  @Column({ name: "LAST_CHECK_OUT", type: "timestamp", nullable: true })
  last_check_out!: Date | null;

  @Column({ name: "CHECK_IN", type: "timestamp", nullable: true })
  check_in!: Date | null;

  @Column({ name: "CHECK_OUT", type: "timestamp", nullable: true })
  check_out!: Date | null;

  @Column({ name: "TOTAL_HOURS", type: "number", nullable: true })
  total_hours!: number | null;

  @Column({ name: "STATUS", type: "varchar2", length: 20 })
  status!: string;

  @Column({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  //Relation
  @ManyToOne(() => Employee, employee => employee.attendanceRecords)
  @JoinColumn({ name: "EMPLOYEE_ID", referencedColumnName: "employee_id" })
  employee!: Employee;

  //relaonship with AttendanceEvent
  @OneToMany(() => AttendanceEvent,
    (event) => event.attendance_record_id,
    { eager: false }
  )
  events?: AttendanceEvent[];
}
