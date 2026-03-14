import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from "typeorm";
import constants from "../helpers/constants";

@Entity(constants.TABLE.TI_PACKDET_SERIES)
export class TiPackdetSeries {
  // Create a composite primary key using all unique identifiers
  @PrimaryColumn({ name: "COMPANY_CODE", type: "varchar2", length: 7 })
  company_code!: string;

  @PrimaryColumn({ name: "PRIN_CODE", type: "varchar2", length: 5 })
  prin_code!: string;

  @PrimaryColumn({ name: "JOB_NO", type: "varchar2", length: 10 })
  job_no!: string;

  @PrimaryColumn({ name: "PACKDET_NO", type: "number" })
  packdet_no!: number;

  @PrimaryColumn({ name: "SERIAL_NUMBER", type: "varchar2", length: 50 })
  serial_number!: string;

  @Column({ name: "LABEL_NUMBER", type: "varchar2", length: 50 })
  label_number!: string;

  @Column({ name: "QUANTITY", type: "decimal", precision: 12, scale: 1 })
  quantity!: number;

  @Column({ name: "REMARKS", type: "varchar2", length: 50, nullable: true })
  remarks!: string;

  @Column({ name: "PROD_CODE", type: "varchar2", length: 40 })
  prod_code!: string;

  @Column({
    name: "CONTAINER_NO",
    type: "varchar2",
    length: 20,
    nullable: true,
  })
  container_no!: string;

  @Column({ name: "DISTRIBUTER", type: "varchar2", length: 70, nullable: true })
  distributer!: string;

  @UpdateDateColumn({ name: "UPDATED_AT" })
  updated_at!: Date;

  @Column({ name: "UPDATED_BY", type: "varchar2", length: 50, nullable: true })
  updated_by!: string;

  @Column({ name: "CREATED_BY", type: "varchar2", length: 20, nullable: true })
  created_by!: string;

  @CreateDateColumn({ name: "CREATED_AT" })
  created_at!: Date;
}
