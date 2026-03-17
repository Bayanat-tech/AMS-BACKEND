import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import constants from "../../helpers/constants";
import { Employee } from "./employee.entity";

export enum AttendanceRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

@Entity({ name: constants.TABLE.ATTENDANCE_REQUESTS })
@Index(["employee_id", "company_code"])
@Index(["company_code"])
export class AttendanceRequest {
  @PrimaryColumn({ name: "ID", type: "varchar2", length: 36 })
  id!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 5 })
  company_code!: string;

  @Column({ name: "EMPLOYEE_ID", type: "varchar2", length: 20 })
  employee_id!: string;

  @Column({ name: "EMPLOYEE_CODE", type: "varchar2", length: 50 })
  employee_code!: string;

  @Column({ name: "REQUESTED_BY", type: "varchar2", length: 50, nullable: true })
  requested_by!: string | null;

  @Column({ name: "EVENT_TYPE", type: "varchar2", length: 20 })
  event_type!: string;

  @Column({ name: "EVENT_TIME", type: "timestamp" })
  event_time!: Date;

  @Column({ name: "S3_IMAGE_KEY", type: "varchar2", length: 500, nullable: true })
  s3_image_key!: string | null;

  @Column({ name: "STATUS", type: "varchar2", length: 20, default: AttendanceRequestStatus.PENDING })
  status!: AttendanceRequestStatus;

    @Column({ name: "APPROVED_BY", type: "varchar2", length: 50, nullable: true })
    approved_by!: string | null;

  @Column({ name: "REJECTED_BY", type: "varchar2", length: 50, nullable: true })
  rejected_by!: string | null;

  @Column({ name: "APPROVED_AT", type: "timestamp", nullable: true })
  approved_at!: Date | null;

  @Column({ name: "NOTES", type: "clob", nullable: true })
  notes!: any | null;

  @Column({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Employee, (employee) => (employee as any).attendanceEvents)
  @JoinColumn({ name: "EMPLOYEE_ID", referencedColumnName: "employee_id" })
  employee!: Employee;
}
