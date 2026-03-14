// sec_login table interface
export interface SecLoginscreenaccess {
  user_id: string;
  username: string;
  company_code: string;
}

// MS_PS_project_master table interface
export interface MSPSProjectMaster {
  project_code: string;
  project_name: string;
  company_code: string;
}

// MS_PROJECT_USER_ASSIGN table interface
export interface MSProjectUserAssign {
  user_id: string;
  project_code: string;
}

export interface UserProjectSelection {
  user: SecLoginscreenaccess;
  project: MSPSProjectMaster;
}
