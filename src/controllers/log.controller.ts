import { Response } from "express";
import constants from "../helpers/constants";
import { RequestWithUser } from "../interfaces/common.interface";
import { IUser } from "../interfaces/user.interface";
import { LogService } from "../services/log.service";

export const getLogs = async (req: RequestWithUser, res: Response) => {
  try {
    const requestUser: IUser = req.user;

    console.log("Fetching logs for user:", requestUser.loginid);

    const [fetchedData, totalCount] = await Promise.all([
      LogService.getUserLogs(requestUser.company_code, requestUser.loginid),
      LogService.countUserLogs(requestUser.company_code, requestUser.loginid),
    ]);

    if (!fetchedData || fetchedData.length === 0) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: constants.MESSAGES.NOT_FOUND,
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: { tableData: fetchedData, count: totalCount },
    });
    return;
  } catch (error: any) {
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
    return;
  }
};

export const getUnReadLogsCount = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;
    console.log("Fetching logs for user123:", requestUser.loginid);
    const count = await LogService.countUnreadLogs(
      requestUser.company_code,
      requestUser.loginid
    );

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: { count },
    });
    return;
  } catch (error: any) {
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
    return;
  }
};

export const updateReadLog = async (req: RequestWithUser, res: Response) => {
  try {
    const requestUser: IUser = req.user;

    const updateResult = await LogService.markLogsAsRead(
      requestUser.company_code,
      requestUser.loginid,
      requestUser.loginid
    );

    if (!updateResult) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: constants.MESSAGES.NOT_FOUND,
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Logs " + constants.MESSAGES.UPDATED_SUCCESSFULLY,
    });
    return;
  } catch (error: any) {
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
    return;
  }
};
