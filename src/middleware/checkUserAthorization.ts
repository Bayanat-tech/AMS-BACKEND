import { NextFunction, Response } from "express";
import { RequestWithUser } from "../interfaces/common.interface";
import { IUser } from "../interfaces/user.interface";
import constants from "../helpers/constants";

// Middleware function to check user authorization
export const checkUserAuthorization = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  // Extract the user object from the request
  const requestUser: IUser = req.user;

  // Check if the user's active flag is set to 'N'
  if (requestUser.active_flag === "N") {
    // If inactive, respond with a 404 status and an error message
    res.status(constants.STATUS_CODES.NOT_FOUND).json({
      success: false,
      message: constants.MESSAGES.USER.USER_NOT_FOUND,
    });
    return;
  }

  // Check if the user's number of days is 0
  if (requestUser.no_of_days === 0) {
    // If no days, respond with a 404 status and an error message
    res.status(constants.STATUS_CODES.NOT_FOUND).json({
      success: false,
      message: constants.MESSAGES.USER.USER_NOT_FOUND,
    });
    return;
  }

  // If user is active and has days, proceed to the next middleware or route handler
  next();
};
