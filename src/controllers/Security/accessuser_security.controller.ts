import { Response } from "express";
import { RequestWithUser } from "../../interfaces/common.interface";
import constants from "../../helpers/constants";
import { secrolefunctionaccessuserschema } from "../../validation/Security/Security.validation";
import { AccessMasterService } from "../../services/Security/accessmaster.service";

// ==================== GET USER ACCESS ====================
export const getSecRollFunctionAccessUser = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { loginid, serial_no_or_role_id } = req.query;

    console.log("Query parameters:", req.query);

    if (!loginid || !serial_no_or_role_id) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "loginid and serial_no_or_role_id are required",
      });
      return;
    }

    const userAccess = await AccessMasterService.findUserAccess(
      loginid as string,
      Number(serial_no_or_role_id),
      req.user.company_code
    );

    if (!userAccess) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "No access found for the given user and screen.",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: userAccess,
    });
  } catch (error: any) {
    console.error("Error in getSecRollFunctionAccessUser:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== CREATE USER ACCESS ====================
export const createSecRollFunctionAccessUser = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { error } = secrolefunctionaccessuserschema(req.body);
    if (error) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.log("Request body:", req.body);

    const {
      loginid,
      serial_no_or_role_id,
      snew,
      smodify,
      sdelete,
      ssave,
      ssearch,
      ssaveas,
      supload,
      sundo,
      sprint,
      sprintsetup,
      shelp,
      company_code,
    } = req.body;

    const createdAccess = await AccessMasterService.createUserAccess({
      loginid,
      serial_no_or_role_id,
      snew,
      smodify,
      sdelete,
      ssave,
      ssearch,
      ssaveas,
      supload,
      sundo,
      sprint,
      sprintsetup,
      shelp,
      company_code,
    });

    if (!createdAccess) {
      res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error while creating user access",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Functionality has been successfully assigned to User.",
    });
  } catch (error: any) {
    console.error("Error in createSecRollFunctionAccessUser:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET OPERATIONAL MASTER ====================
export const getOperationalMaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { serial_no } = req.params;

    if (!serial_no) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "serial_no parameter is required",
      });
      return;
    }

    const operations = await AccessMasterService.getOperationsByModule(
      Number(serial_no)
    );

    if (operations.length === 0) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Module data not found",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: operations,
    });
  } catch (error: any) {
    console.error("Error in getOperationalMaster:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== UPDATE USER ACCESS ====================
export const updateSecRoleFunctionAccessUser = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { error } = secrolefunctionaccessuserschema(req.body);
    if (error) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
      return;
    }

    const { loginid, serial_no_or_role_id, company_code } = req.body;

    const isUpdated = await AccessMasterService.updateUserAccessWithTransaction(
      loginid,
      serial_no_or_role_id,
      company_code,
      req.body
    );

    if (!isUpdated) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Access record not found or update failed",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "User Access UPDATED SUCCESSFULLY",
    });
  } catch (error: any) {
    console.error("Error in updateSecRoleFunctionAccessUser:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== DELETE USER ACCESS ====================
export const deleteSecRollFunctionAccessUser = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { screen_details } = req.body;

    if (
      !screen_details ||
      !Array.isArray(screen_details) ||
      screen_details.length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one Serial No and LoginId to delete",
      });
      return;
    }

    // Validate screen_details structure
    const invalidEntries = screen_details.filter(
      (detail: any) => !detail.serial_no_or_role_id || !detail.loginid
    );

    if (invalidEntries.length > 0) {
      res.status(400).json({
        success: false,
        message:
          "Each screen_detail must contain serial_no_or_role_id and loginid",
      });
      return;
    }

    const isDeleted =
      await AccessMasterService.deleteUserAccessesWithTransaction(
        screen_details
      );

    if (!isDeleted) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "No access records were deleted",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User access was successfully revoked.",
    });
  } catch (error: any) {
    console.error("Error in deleteSecRollFunctionAccessUser:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== ADDITIONAL APIS ====================

// Get module with operations (if needed)
export const getModuleWithOperations = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { serial_no } = req.params;

    if (!serial_no) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "serial_no parameter is required",
      });
      return;
    }

    const moduleData = await AccessMasterService.getModuleWithOperations(
      Number(serial_no)
    );

    if (!moduleData) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Module not found",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: moduleData,
    });
  } catch (error: any) {
    console.error("Error in getModuleWithOperations:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

// Create operation
export const createOperation = async (req: RequestWithUser, res: Response) => {
  try {
    const { error } = secrolefunctionaccessuserschema(req.body);
    if (error) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
      return;
    }

    const createdOperation = await AccessMasterService.createOperation(
      req.body
    );

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Operation created successfully",
      data: createdOperation,
    });
  } catch (error: any) {
    console.error("Error in createOperation:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// Complex operation with transaction
export const createModuleWithOperations = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { moduleData, operationsData } = req.body;

    if (!moduleData || !operationsData || !Array.isArray(operationsData)) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "moduleData and operationsData array are required",
      });
      return;
    }

    const result =
      await AccessMasterService.createModuleWithOperationsTransaction(
        moduleData,
        operationsData
      );

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Module and operations created successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in createModuleWithOperations:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
