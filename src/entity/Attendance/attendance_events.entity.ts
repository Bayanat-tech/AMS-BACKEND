import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import constants from "../../helpers/constants";
import { AttendanceRecord } from "./attendance_record.entity";
import { ProxyLog } from "./ProxyLog.entity";
import { Employee } from "./employee.entity";

export enum AttendanceEventType {
  CHECK_IN = "check_in",
  CHECK_OUT = "check_out",
}

export enum DataTransferFlag {
  Y = "Y",
  N = "N",
  C = "C",
}

export enum AttendanceStatus {
  PENDING = "pending_auto_confirm",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

@Entity({ name: constants.TABLE.ATTENDANCE_EVENTS })
export class AttendanceEvent {
  // @PrimaryGeneratedColumn("uuid")
  @PrimaryColumn({ name: "ID", type: "varchar2", length: 36 })
  id!: string;

  @Column({ name: "EMPLOYEE_ID", type: "varchar2", length: 20 })
  employee_id!: string;

  @Column({ name: "EMPLOYEE_CODE", type: "varchar2", length: 50 })
  employee_code!: string;

  @Column({ name: "ATTENDANCE_RECORD_ID", type: "varchar2", nullable: true })
  attendance_record_id?: string | null;

  @Column({ name: "EVENT_TIME", type: "timestamp" })
  event_time!: Date;

  @Column({ name: "EVENT_TYPE", type: "varchar2", length: 20, enum: AttendanceEventType})
  event_type!: AttendanceEventType;

  @Column({ name: "DATA_TRANSFER", type: "char", length: 1, enum: DataTransferFlag, default: DataTransferFlag.N,})
  data_transfer!: DataTransferFlag;

  @Column({ name: "TRANSFER_DATE", type: "timestamp", nullable: true })
  transfer_date!: Date | null;

  @Column({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  @Column({ name: "LATITUDE", type: "number", precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ name: "LONGITUDE", type: "number", precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ name: "ACCURACY", type: "number", precision: 8, scale: 2, nullable: true })
  accuracy!: number | null;

  @Column({ name: "LOCATION_TYPE",
    type: "varchar2",
    length: 20,
    default: "unknown",
  })
  location_type!: string;

  @Column({ name: "ADDRESS", type: "clob", nullable: true })
  address!: any;

  @Column({ name: "OFFICE_NAME", type: "varchar2", length: 100, nullable: true })
  office_name!: string | null;

  @Column({ name: "UUID", type: "varchar2", length: 100, nullable: true })
  uuid!: string | null;

  @Column({ name: "CONFIDENCE", type: "number", precision: 5, scale: 2, nullable: true })
  confidence!: number | null;

  @Column({ name: "S3_IMAGE_URL", type: "varchar2", length: 500, nullable: true })
  s3_image_url!: string | null;

  @Column({ name: "STATUS",
    type: "varchar2",
    length: 30,
    enum: AttendanceStatus,
    default: AttendanceStatus.CONFIRMED,
  })
  status!: AttendanceStatus;

  @Column({ name: "CONFIRMED_BY", type: "varchar2", length: 50, nullable: true })
  confirmed_by!: string | null;

  @Column({ name: "CONFIRMED_AT", type: "timestamp", nullable: true })
  confirmed_at!: Date | null;

  @Column({ name: "AUTO_CONFIRM_TIME", type: "timestamp", nullable: true })
  auto_confirm_time!: Date | null;

  @Column({ name: "CANCELLATION_REASON", type: "varchar2", length: 500, nullable: true })
  cancellation_reason!: string;

  //Virtual composed field — NOT stored in DB (avoids selecting non-existing column)
  get location_data() {
    if (
      this.latitude == null &&
      this.longitude == null &&
      this.accuracy == null &&
      !this.address &&
      !this.location_type &&
      !this.office_name
    ) {
      return null;
    }

    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      location_type: this.location_type,
      office_name: this.office_name,
      address: this.address,
    };
  }

  @ManyToOne(() => Employee, employee => employee.attendanceEvents)
  @JoinColumn({ name: "EMPLOYEE_ID", referencedColumnName: "employee_id" })
  employee!: Employee;

  @ManyToOne(() => AttendanceRecord, record => record.events)
  @JoinColumn({ name: "ATTENDANCE_RECORD_ID" })
  record!: AttendanceRecord;

  // AttendanceEvent to ProxyLog 
  @OneToOne(() => ProxyLog, log => log.attendanceEvent)
  proxyLog!: ProxyLog;

}
