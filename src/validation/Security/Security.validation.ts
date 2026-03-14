import Joi from "joi";

import {
  ICompanymaster,
  IFlowmaster,
} from "../../interfaces/Security/Security.interfae";

import { IRolemaster } from "../../interfaces/Security/Security.interfae";

import { ISecmaster } from "../../interfaces/Security/Security.interfae";

import { ISecmodule } from "../../interfaces/Security/Security.interfae";

import { MSProjectUserAssign } from "../../interfaces/Security/Screenacess.interface";

import { IMsPsUserRoleMapping } from "../../interfaces/Security/Userrollacess.interface";

import { ISECROLEAPPACCESS } from "../../interfaces/Security/Accesstoroll.interface";
import { join } from "path";
import { IUSERSECROLEFUNCTIONACCESSUSER } from "../../interfaces/Security/Accesstouser.interface";

import { IMSCOMPANYUSERASSIGN } from "../../interfaces/Security/Userdivisionacess.interface";

import { IReportmaster } from "../../interfaces/Security/Security.interfae";

import { IQuerymaster } from "../../interfaces/Security/Security.interfae";

export const flowmasterSchema = (data: IFlowmaster) => {
  const schema = Joi.object().keys({
    company_code: Joi.string().required(),
    flow_code: Joi.string().optional().allow(""),
    flow_description: Joi.string().required(),
  });
  return schema.validate(data);
};
export const rolemasterSchema = (data: IRolemaster) => {
  const schema = Joi.object().keys({
    company_code: Joi.string().required(),
    role_id: Joi.number().optional().allow(""), // No longer required
    role_desc: Joi.string().required(),
    remarks: Joi.string(),
  });
  return schema.validate(data);
};

export const secmasterSchema = (data: ISecmaster) => {
  const schema = Joi.object().keys({
    company_code: Joi.string().required(),
    id: Joi.number().optional().allow(""),
    username: Joi.string().required(),
    userpass: Joi.string(),
    contact_no: Joi.string().optional().allow(""),
    email_id: Joi.string(),
    loginid: Joi.string().optional().allow(""),
    user_code: Joi.string().optional().allow(""),
    user_id: Joi.string().optional().allow(""),
    active_flag: Joi.string().optional().allow(""),
  });
  return schema.validate(data);
};

export const secmoduleSchema = (data: ISecmodule) => {
  const schema = Joi.object().keys({
    company_code: Joi.string().required(),
    app_code: Joi.string().required(),
    serial_no: Joi.number().optional().allow(""),
    level1: Joi.string(),
    level2: Joi.string().optional().allow(""),
    level3: Joi.string().optional().allow(""),
    position: Joi.number().optional().allow(""),
    url_path: Joi.string(),
    icon: Joi.string().optional().allow("").allow(null),
    user_dt: Joi.date().optional().allow("").allow(null),
    userid: Joi.string().optional().allow("").allow(null),
    create_user: Joi.string().optional().allow("").allow(null),
    create_date: Joi.date().optional().allow("").allow(null),
    history_serial: Joi.number().optional().allow("").allow(null),
  });
  return schema.validate(data);
};

export const companySchema = (data: ICompanymaster) => {
  const schema = Joi.object().keys({
    company_code: Joi.string().required(),
    company_name: Joi.string(),
    address1: Joi.string(),
    address2: Joi.string(),
    address3: Joi.string(),
    city: Joi.string(),
    country: Joi.string(),
  });
  return schema.validate(data);
};

export const MSPSProjectMasterschema = (data: MSProjectUserAssign) => {
  const MSPSProjectMasterschema = Joi.object().keys({
    user_id: Joi.string(),
    project_code: Joi.string(),
  });
  return MSPSProjectMasterschema.validate(data);
};

export const MsPsUserRoleMappingSchema = (data: IMsPsUserRoleMapping) => {
  const MsPsUserRoleMappingSchema = Joi.object().keys({
    user_code: Joi.string(),
    user_role: Joi.string(),
    company_code: Joi.string(),
    user_id: Joi.string().optional().allow(""),
  });
  return MsPsUserRoleMappingSchema.validate(data);
};

export const SecRoleAppAccessschema = (data: ISECROLEAPPACCESS) => {
  const SecRoleAppAccessschema = Joi.object().keys({
    role_id: Joi.number().integer(),
    serial_no: Joi.number().integer(),
    snew: Joi.string(),
    smodify: Joi.string(),
    sdelete: Joi.string(),
    ssave: Joi.string(),
    ssearch: Joi.string(),
    ssaveas: Joi.string(),
    supload: Joi.string(),
    sundo: Joi.string(),
    sprint: Joi.string(),
    sprintsetup: Joi.string(),
    shelp: Joi.string(),
    company_code: Joi.string(),
  });
  return SecRoleAppAccessschema.validate(data);
};

export const secrolefunctionaccessuserschema = (
  data: IUSERSECROLEFUNCTIONACCESSUSER
) => {
  const secrolefunctionaccessuserschema = Joi.object().keys({
    loginid: Joi.string(),
    serial_no_or_role_id: Joi.number().integer(),
    snew: Joi.string(),
    smodify: Joi.string(),
    sdelete: Joi.string(),
    ssave: Joi.string(),
    ssearch: Joi.string(),
    ssaveas: Joi.string(),
    supload: Joi.string(),
    sundo: Joi.string(),
    sprint: Joi.string(),
    sprintsetup: Joi.string(),
    shelp: Joi.string(),
    company_code: Joi.string(),
  });
  return secrolefunctionaccessuserschema.validate(data);
};

export const MSPsDivisionMasterschema = (data: IMSCOMPANYUSERASSIGN) => {
  const MSPsDivisionMasterschema = Joi.object().keys({
    user_id: Joi.string(),
    div_code: Joi.string(),
    divn_code: Joi.string().optional().allow(""),
  });
  return MSPsDivisionMasterschema.validate(data);
};

export const MsReportMasterSchema = (data: IReportmaster) => {
  const schema = Joi.object().keys({
    reportid: Joi.string().required(),
    reportname: Joi.string().required(),
    module: Joi.string().required(),
    company_code: Joi.string().required(),
  });
  return schema.validate(data);
};

export const QuerySchema = (data: IQuerymaster) => {
  const schema = Joi.object().keys({
    SR_NO: Joi.number().optional().allow(""),
    COMPANY_CODE: Joi.string().required(),
    PARAMETER: Joi.string().required(),
    SQL_STRING: Joi.string().required(),
    STRING1: Joi.string().optional().allow(""),
    STRING2: Joi.string().optional().allow(""),
    STRING3: Joi.string().optional().allow(""),
    STRING4: Joi.string().optional().allow(""),
    ORDER_BY: Joi.string().optional().allow(""),
    USTRING1: Joi.string().optional().allow(""),
    USTRING2: Joi.string().optional().allow(""),
    USTRING3: Joi.string().optional().allow(""),
    USTRING4: Joi.string().optional().allow(""),
    USTRING5: Joi.string().optional().allow(""),
    USTRING6: Joi.string().optional().allow(""),
  });
  return schema.validate(data);
}