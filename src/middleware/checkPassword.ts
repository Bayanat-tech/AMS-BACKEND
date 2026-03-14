import { NextFunction, Response } from "express";
import { RequestWithUser } from "../interfaces/common.interface";
import { IUser } from "../interfaces/user.interface";
import constants from "../helpers/constants";
import { Company } from "../entity/Company";
import { AppDataSource } from "../database/connection";
 
export const checkPassword = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const requestUser: IUser = req.user;
  const { activityPassword } = req.body;
 
  const CompanyRepo = AppDataSource.getRepository(Company);
 
  const company = await CompanyRepo.findOne({
    where: { company_code: requestUser.company_code },
  });
  //console.log(company?.dataValues.bill_auth_pwd, activityPassword);
 
  if (!company || company.bill_auth_pwd !== activityPassword) {
    res.status(constants.STATUS_CODES.FORBIDDEN).json({
      success: false,
      message: constants.MESSAGES.UNAUTHORIZED,
    });
    return;
  }
  next();
};