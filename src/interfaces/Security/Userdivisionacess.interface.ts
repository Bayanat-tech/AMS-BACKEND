export interface ISecLogin {
  user_id: string;
  username: string;
  company_code: string;
}

export interface IMSHRDIVISION {
  div_code: string;
  div_name: string;
  company_code: string;
}

export interface IMSCOMPANYUSERASSIGN {
  div_code: string;
  user_id: string;
  divn_code: string;
}
