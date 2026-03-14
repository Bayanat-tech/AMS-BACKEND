export interface IUser {
  company_code: string;
  loginid: string;
  loginid1?: string;
  email_id: string;
  username: string;
  contact_name?: string;
  contact_no?: string;
  contact_email?: string;
  updated_by: string;
  created_by: string;
  created_at: Date;
  userpass: string;
  no_of_days?: number;
  active_flag: string;
  SEC_PASSWD: string;
  APPLICATION?: string;
  user_id?: any;
  country_code?: string;
}
