import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import constants from "../../helpers/constants";
import { AccessSecOperation } from "./accesssecoperation.entity";

@Entity(constants.TABLE.SEC_MODULE_DATA)
export class AccessSecModuleData {
  @PrimaryColumn({ name: "SERIAL_NO", type: "number" })
  serial_no!: number;

  @Column({ name: "APP_CODE", type: "varchar2", length: 10 })
  app_code!: string;

  @Column({ name: "LEVEL3", type: "varchar2", length: 30 })
  level3!: string;

  @Column({ name: "COMPANY_CODE", type: "varchar2", length: 10 })
  company_code!: string;

  // One-to-Many relationship with AccessSecOperation
  @OneToMany(() => AccessSecOperation, (operation) => operation.module)
  operations!: AccessSecOperation[];
}
