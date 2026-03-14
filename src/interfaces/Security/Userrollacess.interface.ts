export interface ISecLoginroleaccess {
  user_id: string;
  username: string;
  company_code: string;
}

export interface IMsPsRole {
  user_role: string;
  role_name: string;
  company_code: string;
}

export interface IMsPsUserRoleMapping {
  company_code: string;
  user_role: string;
  user_id: string;
  user_Code?: string;
  user_name?: string;
  user_dt?: Date;
}
