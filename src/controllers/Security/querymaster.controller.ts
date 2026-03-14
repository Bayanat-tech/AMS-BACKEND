import { Response } from "express";
import { RequestWithUser } from "../../interfaces/common.interface";
import { IUser } from "../../interfaces/user.interface";
import constants from "../../helpers/constants";
import { QuerySchema } from "../../validation/Security/Security.validation";
import { QueryMasterService } from "../../services/Security/querymaster.service";

export const createquerymaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;

    const { error } = QuerySchema(req.body);
    if (error) {
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
      return;
    }

    const {
      COMPANY_CODE,
      PARAMETER,
      SQL_STRING,
      STRING1,
      STRING2,
      STRING3,
      STRING4,
      ORDER_BY,
      USTRING1,
      USTRING2,
      USTRING3,
      USTRING4,
      USTRING5,
      USTRING6,
    } = req.body;

    // Check for duplicate SQL_STRING
    const existingQuery = await QueryMasterService.findBySqlString(SQL_STRING);

    if (existingQuery) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: constants.MESSAGES.QUERYMASTER.RECORD_ALREADY_EXISTS,
      });
      return;
    }

    // Create query
    const createdQuery = await QueryMasterService.createQuery({
      company_code: COMPANY_CODE,
      parameter: PARAMETER,
      sql_string: SQL_STRING,
      string1: STRING1,
      string2: STRING2,
      string3: STRING3,
      string4: STRING4,
      order_by: ORDER_BY,
      ustring1: USTRING1,
      ustring2: USTRING2,
      ustring3: USTRING3,
      ustring4: USTRING4,
      ustring5: USTRING5,
      ustring6: USTRING6,
      created_by: requestUser.loginid,
      updated_by: requestUser.loginid,
    });

    if (!createdQuery) {
      res
        .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error while creating query" });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: constants.MESSAGES.QUERYMASTER.RECORD_CREATED_SUCCESSFULLY,
    });
  } catch (error: any) {
    console.error("Error in createquerymaster:", error);
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};

export const updatequerymaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;

    const { error } = QuerySchema(req.body);
    if (error) {
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
      return;
    }

    const { SR_NO, SQL_STRING } = req.body;

    // Check for duplicate SQL_STRING excluding current record
    const duplicateQuery = await QueryMasterService.checkDuplicateSqlString(
      SQL_STRING,
      SR_NO
    );

    if (duplicateQuery) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Query already exists.",
      });
      return;
    }

    // Check if query exists
    const existingQuery = await QueryMasterService.findBySrNo(SR_NO);

    if (!existingQuery) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: constants.MESSAGES.QUERYMASTER.RECORD_DOES_NOT_EXISTS,
      });
      return;
    }

    // Update query
    const updateData = {
      ...req.body,
      updated_by: requestUser.loginid,
    };

    const isUpdated = await QueryMasterService.updateQuery(SR_NO, updateData);

    if (!isUpdated) {
      res
        .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error while updating query" });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: constants.MESSAGES.QUERYMASTER.RECORD_UPDATED_SUCCESSFULLY,
    });
  } catch (error: any) {
    console.error("Error in updatequerymaster:", error);
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};
