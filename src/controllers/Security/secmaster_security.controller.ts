import { Response } from "express";
import { RequestWithUser } from "../../interfaces/common.interface";
import { IUser } from "../../interfaces/user.interface";
import constants from "../../helpers/constants";
import { secmasterSchema } from "../../validation/Security/Security.validation";
import { SecmasterService } from "../../services/Security/secmaster.service";

export class SecmasterController {
  static async createsecmaster(req: RequestWithUser, res: Response) {
    try {
      const requestUser: IUser = req.user;

      const { error } = secmasterSchema(req.body);
      if (error) {
        res
          .status(constants.STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: error.message });
        return;
      }

      const {
        username,
        contact_no,
        email_id,
        userpass,
        company_code,
        active_flag,
      } = req.body;

      // Check if email already exists
      const emailExists = await SecmasterService.findByEmailAndCompany(
        email_id,
        company_code
      );

      if (emailExists) {
        res.status(constants.STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Email already exists.",
        });
        return;
      }

      // Check for duplicate user
      const duplicateUser = await SecmasterService.checkDuplicateUser({
        company_code,
        contact_no,
        email_id,
        username,
      });

      if (duplicateUser) {
        res.status(constants.STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: constants.MESSAGES.SECMASTER_WMS.SECMASTER_ALREADY_EXISTS,
        });
        return;
      }

      // Create user
      const createdUser = await SecmasterService.createUser({
        company_code,
        contact_no,
        email_id,
        username,
        userpass,
        active_flag,
        created_by: requestUser.loginid,
        updated_by: requestUser.loginid,
      });

      if (!createdUser) {
        res
          .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Error while creating user" });
        return;
      }

      res.status(constants.STATUS_CODES.OK).json({
        success: true,
        message:
          constants.MESSAGES.SECMASTER_WMS.SECMASTER_CREATED_SUCCESSFULLY,
      });
    } catch (error: any) {
      console.error("Error in createsecmaster:", error);
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }
  }

  static async updatesecmaster(req: RequestWithUser, res: Response) {
    try {
      const requestUser: IUser = req.user;
      console.log("Request Body:", req.body); 

      const { error } = secmasterSchema(req.body);
      if (error) {
        res
          .status(constants.STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: error.message });
        return;
      }

      const { id, company_code, loginid, email_id } = req.body;

      // Check for duplicate email (excluding current record)
      const emailExists =
        await SecmasterService.checkEmailExistsExcludingCurrent(
          email_id,
          company_code,
          loginid 
        );

      if (emailExists) {
        res.status(constants.STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Email already exists.",
        });
        return;
      }

      // Check if user exists
      const existingUser = await SecmasterService.findByIdAndCompany(
        id,
        company_code,
        loginid,
        email_id
      );
      if (!existingUser) {
        res.status(constants.STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: constants.MESSAGES.SECMASTER_WMS.SECMASTER_DOES_NOT_EXISTS,
        });
        return;
      }

      // Update user
      const updateData = {
        ...req.body,
        updated_by: requestUser.loginid,
      };

      const isUpdated = await SecmasterService.updateUser(
        loginid,
        id,
        company_code,
        email_id,
        updateData
      );

      if (!isUpdated) {
        res
          .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Error while updating user" });
        return;
      }

      res.status(constants.STATUS_CODES.OK).json({
        success: true,
        message:
          constants.MESSAGES.SECMASTER_WMS.SECMASTER_UPDATED_SUCCESSFULLY,
      });
    } catch (error: any) {
      console.error("Error in updatesecmaster:", error);
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }
  }
}
