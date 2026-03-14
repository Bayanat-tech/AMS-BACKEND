export interface IFlowmaster {
  flow_code?: string;
  flow_description: string;
  company_code?: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}
export interface IRolemaster {
  role_id?: number;
  role_desc: string;
  remarks?: string;
  company_code?: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface ISecmaster {
  id?: number;
  username: string;
  contact_no: string;
  userpass: string;
  email_id?: string;
  company_code?: string;
  loginid?: string;
  user_id?: string;
  user_code?: string;
  active_flag?: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface ISecmodule {
  company_code?: string;
  app_code: string;
  serial_no?: number;
  level1: string;
  level2: string;
  level3: string;
  position?: number;
  url_path: string;
  icon: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface ICompanymaster {
  company_code: string;
  company_name: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  country: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface IReportmaster {
  company_code: string;
  module: string;
  report_no?: number;
  reportname: string;
  reportid: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface IQuerymaster {
  SR_NO?: number;
  COMPANY_CODE: string;
  PARAMETER: String;
  SQL_STRING: string;
  STRING1?: string;
  STRING2?: string;
  STRING3?: string;
  STRING4?: string;
  ORDER_BY?: string;
  USTRING1?: string;
  USTRING2?: string;
  USTRING3?: string;
  USTRING4?: string;
  USTRING5?: string;
  USTRING6?: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}