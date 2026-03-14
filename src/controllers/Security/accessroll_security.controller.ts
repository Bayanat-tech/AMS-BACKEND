import { Response } from "express";
import { RequestWithUser } from "../../interfaces/common.interface";
import { IUser } from "../../interfaces/user.interface";
import constants from "../../helpers/constants";
import { SecRoleAppAccessschema } from "../../validation/Security/Security.validation";
import { AccessRoleService } from "../../services/Security/accessrole.service";

// ==================== GET ROLE ACCESS ====================
export const getSecRollAppAccess = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { role_id, serial_no } = req.query;

    console.log("Query parameters:", req.query);

    if (!role_id || !serial_no) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "role_id and serial_no are required",
      });
      return;
    }

    const roleAccess = await AccessRoleService.findRoleAccess(
      Number(role_id),
      Number(serial_no),
      req.user.company_code
    );

    if (!roleAccess) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "No access found for the given role and screen.",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: roleAccess,
    });
  } catch (error: any) {
    console.error("Error in getSecRollAppAccess:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== CREATE ROLE ACCESS ====================
export const createSecRollAppAccess = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { error } = SecRoleAppAccessschema(req.body);
    if (error) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.log("Request body:", req.body);

    const {
      role_id,
      serial_no,
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

    const createdAccess = await AccessRoleService.createRoleAccess({
      role_id,
      serial_no,
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
        message: "Error while creating role access",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Functionality has been successfully assigned to Role.",
    });
  } catch (error: any) {
    console.error("Error in createSecRollAppAccess:", error);
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

    const operations = await AccessRoleService.getOperationsByModule(
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

// ==================== UPDATE ROLE ACCESS ====================
export const updateSecRollAppAccess = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { error } = SecRoleAppAccessschema(req.body);
    if (error) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
      return;
    }

    const { role_id, serial_no, company_code } = req.body;

    const isUpdated = await AccessRoleService.updateRoleAccessWithTransaction(
      role_id,
      serial_no,
      company_code,
      req.body
    );

    if (!isUpdated) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Role access record not found or update failed",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "ROLES UPDATED SUCCESSFULLY",
    });
  } catch (error: any) {
    console.error("Error in updateSecRollAppAccess:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== DELETE ROLE ACCESS ====================
export const deleteSecRollAppAccess = async (
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
        message: "Please provide at least one Serial No and Role Id to delete",
      });
      return;
    }

    // Validate screen_details structure
    const invalidEntries = screen_details.filter(
      (detail: any) => !detail.serial_no || !detail.role_id
    );

    if (invalidEntries.length > 0) {
      res.status(400).json({
        success: false,
        message: "Each screen_detail must contain serial_no and role_id",
      });
      return;
    }

    const isDeleted = await AccessRoleService.deleteRoleAccessesWithTransaction(
      screen_details
    );

    if (!isDeleted) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "No role access records were deleted",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Role access was successfully revoked.",
    });
  } catch (error: any) {
    console.error("Error in deleteSecRollAppAccess:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== BULK CREATE ROLE ACCESSES ====================
export const createMultipleRoleAccesses = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const { accesses } = req.body;

    if (!accesses || !Array.isArray(accesses) || accesses.length === 0) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Please provide access data array",
      });
      return;
    }

    // Validate each access object
    for (const access of accesses) {
      const { error } = SecRoleAppAccessschema(access);
      if (error) {
        res.status(constants.STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: `Validation error for access: ${error.message}`,
        });
        return;
      }
    }

    const createdAccesses =
      await AccessRoleService.createMultipleRoleAccessesWithTransaction(
        accesses
      );

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: `${createdAccesses.length} role accesses created successfully`,
      data: createdAccesses,
    });
  } catch (error: any) {
    console.error("Error in createMultipleRoleAccesses:", error);
    res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
