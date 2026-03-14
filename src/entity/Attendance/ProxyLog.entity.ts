import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Employee } from "./employee.entity";
import { AttendanceEvent } from "./attendance_events.entity";
import constants from "../../helpers/constants";

@Entity({ name: constants.TABLE.PROXY_LOGS })
export class ProxyLog {
  @PrimaryColumn({ name: "ID", type: "varchar2", length: 36 })
  id!: string;

  @Column({ name: "UUID", type: "varchar2", length: 100, nullable: true })
  uuid!: string | null;

  @Column({ name: "TIMESTAMP", type: "timestamp" })
  timestamp!: Date;

  @Column({ name: "PROXY_EMPLOYEE_CODE", type: "varchar2", length: 100 })
  proxy_employee_code!: string;

  @Column({ name: "PROXY_EMPLOYEE_NAME", type: "varchar2", length: 255 })
  proxy_employee_name!: string;

  @Column({ name: "ACTUAL_EMPLOYEE_CODE", type: "varchar2", length: 100, nullable: true })
  actual_employee_code!: string | null;

  @Column({ name: "ACTUAL_EMPLOYEE_NAME", type: "varchar2", length: 255, nullable: true })
  actual_employee_name!: string | null;

  @Column({ name: "CONFIDENCE", type: "number", precision: 5, scale: 2 })
  confidence!: number;

  @Column({ name: "S3_IMAGE_URL", type: "varchar2", length: 500, nullable: true })
  s3_image_url!: string | null;

  @Column({ name: "LOCATION_DATA", type: "clob", nullable: true })
  location_data!: any | null;

  @Column({ name: "ACTION", type: "varchar2", length: 20 })
  action!: "check_in" | "check_out";

  @Column({ name: "ACTION_TAKEN", type: "varchar2", length: 60 })
  action_taken!: "cancelled_by_user" | "auto_rejected" | "attempted_cancellation_after_confirmation";

  @Column({ name: "DEVICE_TYPE", type: "varchar2", length: 255, nullable: true })
  device_type!: string | null;

  @Column({ name: "STATUS", type: "varchar2", length: 50, default: "reported" })
  status!: string;

  @Column({ name: "CREATED_AT", type: "timestamp", nullable: true })
  created_at!: Date | null;

  @Column({ name: "REASON", type: "varchar2", length: 400, nullable: false })
  reason!: string | null;
  attendanceEvent: any;

 //Relations
  @ManyToOne(() => Employee, employee => employee.proxyLogsAsProxy)
  @JoinColumn({ name: "PROXY_EMPLOYEE_CODE", referencedColumnName: "employee_code" })
  proxyEmployee!: Employee;

  // Actual employee
  @ManyToOne(() => Employee, employee => employee.proxyLogsAsActual)
  @JoinColumn({ name: "ACTUAL_EMPLOYEE_CODE", referencedColumnName: "employee_code" })
  actualEmployee!: Employee;

  //Attendance event
  @OneToOne(() => AttendanceEvent, event => event.proxyLog)
  @JoinColumn({ name: "UUID", referencedColumnName: "uuid" })
  attendanceEvents!: AttendanceEvent;
}
