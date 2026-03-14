export interface IUSERSECLOGIN {
  loginid: string;
  username: string;
  company_code: string;
}
export interface IUSERSECMODULEDATA {
  serial_no: number;
  level3: string;
  company_code: string;
}
export interface IUSERSECOPERATIONMASTER {
  serial_no: number;
  snew: string;
  smodify: string;
  sdelete: string;
  ssave: string;
  ssearch: string;
  ssaveas: string;
  supload: string;
  sundo: string;
  sprint: string;
  sprintsetup: string;
  shelp: string;
  company_code: string;
}

export interface IUSERSECROLEFUNCTIONACCESSUSER {
  loginid: string;
  serial_no_or_role_id: number;
  snew: string;
  smodify: string;
  sdelete: string;
  ssave: string;
  ssearch: string;
  ssaveas: string;
  supload: string;
  sundo: string;
  sprint: string;
  sprintsetup: string;
  shelp: string;
  company_code: string;
}
