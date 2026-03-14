export interface ISECROLEMASTER {
  role_id: number;
  role_desc: string;
  company_code: string;
}

export interface IACCESSSECMODULEDATA {
  serial_no: number;
  level3: string;
  company_code: string;
}

export interface ISECOPERATIONMASTER {
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

export interface ISECROLEAPPACCESS {
  role_id: number;
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
