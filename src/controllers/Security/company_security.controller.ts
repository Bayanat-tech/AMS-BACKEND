import { Response } from "express";
import { RequestWithUser } from "../../interfaces/common.interface";
import { IUser } from "../../interfaces/user.interface";
import constants from "../../helpers/constants";
import { companySchema } from "../../validation/Security/Security.validation";
import { CompanyService } from "../../services/Security/company.service";

export const createcompanymaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;

    const { error } = companySchema(req.body);
    if (error) {
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
      return;
    }

    const {
      company_code,
      company_name,
      address1,
      address2,
      address3,
      city,
      country,
    } = req.body;

    // Check for duplicate company
    const duplicateCompany = await CompanyService.findDuplicate({
      company_code,
      company_name,
      address1,
      address2,
      address3,
      city,
      country,
    });

    if (duplicateCompany) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: constants.MESSAGES.COMPANY_SEC.COMPANY_ALREADY_EXISTS,
      });
      return;
    }

    // Create company
    const createdCompany = await CompanyService.createCompany({
      company_code,
      company_name,
      address1,
      address2,
      address3,
      city,
      country,
      created_by: requestUser.loginid,
      updated_by: requestUser.loginid,
    });

    if (!createdCompany) {
      res
        .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error while creating company" });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: constants.MESSAGES.COMPANY_SEC.COMPANY_CREATED_SUCCESSFULLY,
    });
  } catch (error: any) {
    console.error("Error in createcompanymaster:", error);
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};

export const updatecompanymaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;

    const { error } = companySchema(req.body);
    if (error) {
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
      return;
    }

    const { company_code } = req.body;

    // Check if company exists
    const existingCompany = await CompanyService.findByCompanyCode(
      company_code
    );

    if (!existingCompany) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: constants.MESSAGES.COMPANY_SEC.COMPANY_DOES_NOT_EXISTS,
      });
      return;
    }

    // Update company
    const updateData = {
      ...req.body,
      updated_by: requestUser.loginid,
    };

    const isUpdated = await CompanyService.updateCompany(
      company_code,
      updateData
    );

    if (!isUpdated) {
      res
        .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error while updating company" });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: constants.MESSAGES.COMPANY_SEC.COMPANY_UPDATED_SUCCESSFULLY,
    });
  } catch (error: any) {
    console.error("Error in updatecompanymaster:", error);
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};
