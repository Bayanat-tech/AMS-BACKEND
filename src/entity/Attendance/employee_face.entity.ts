import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import constants from "../../helpers/constants";
import { Employee } from "./employee.entity";

@Entity({ name: constants.TABLE.EMPLOYEE_FACES })
@Index(["employee_id", "company_code"])
@Index(["company_code"])

export class EmployeeFace {
  // @PrimaryGeneratedColumn("uuid")
  @PrimaryColumn({ name: "ID", type: "varchar2", length: 36 })
  id!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 5 })
  company_code!: string;

  @Column({ name: "EMPLOYEE_ID", type: "varchar2", length: 20 })
  employee_id!: string;

  @Column({ name: "S3_KEY", type: "varchar2", length: 255 })
  s3_key!: string;

  @Column({ name: "DESCRIPTOR", type: "clob" })
  descriptor!: string;

 @Column({ name: "IS_ACTIVE", type: "number", precision: 1, default: "1"})
 is_active!: "1" | "0";

  @Column({ name: "CREATED_AT", type: "timestamp" })
  created_at!: Date;

  @ManyToOne(() => Employee, employee => employee.employeeFaces)
  @JoinColumn({ name: "EMPLOYEE_ID", referencedColumnName: "employee_id" })
  employee!: Employee;
}
