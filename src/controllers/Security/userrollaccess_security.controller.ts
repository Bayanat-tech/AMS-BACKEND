// import { Response } from "express";
// import { RequestWithUser } from "../../interfaces/common.interface";
// import constants from "../../helpers/constants";
// import { MsPsUserRoleMappingSchema } from "../../validation/Security/Security.validation";
// import { UserRoleAccessService } from "./../../services/Security/userroleaccess.service";

// // ==================== CREATE ROLE ACCESS ====================
// export const createrollaccess = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { error } = MsPsUserRoleMappingSchema(req.body);
//     if (error) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: error.message,
//       });
//       return;
//     }

//     const { user_id, user_role, company_code } = req.body;

//     // Validate user and role exist
//     const { userExists, roleExists } =
//       await UserRoleAccessService.validateUserAndRoleExist(user_id, user_role);

//     if (!userExists) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "User not found",
//       });
//       return;
//     }

//     if (!roleExists) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "Role not found",
//       });
//       return;
//     }

//     const mapping = await UserRoleAccessService.createUserRoleMapping({
//       user_id,
//       user_role,
//       company_code,
//       user_code: user_id,
//       user_name: user_id,
//       user_dt: new Date(),
//     });

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: "Role has been successfully assigned.",
//       data: mapping,
//     });
//   } catch (error: any) {
//     console.error("Error in createrollaccess:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== GET USER ASSIGNED ROLES ====================
// export const getUserAssignedRoll = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { user_id } = req.params;

//     if (!user_id) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "user_id parameter is required",
//       });
//       return;
//     }

//     const roles = await UserRoleAccessService.getUserAssignedRolesSimplified(
//       user_id
//     );

//     if (roles.length === 0) {
//       res.status(constants.STATUS_CODES.NOT_FOUND).json({
//         success: false,
//         message: "No roles found for this user",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: roles,
//     });
//   } catch (error: any) {
//     console.error("Error in getUserAssignedRoll:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== DELETE ROLE ACCESS ====================
// export const deleterollaccess = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { screen_details } = req.body;

//     if (
//       !screen_details ||
//       !Array.isArray(screen_details) ||
//       screen_details.length === 0
//     ) {
//       res.status(400).json({
//         success: false,
//         message:
//           "Please provide at least one user Code and user role to delete",
//       });
//       return;
//     }

//     // Validate screen_details structure
//     const invalidEntries = screen_details.filter(
//       (detail: any) => !detail.user_id || !detail.user_role
//     );

//     if (invalidEntries.length > 0) {
//       res.status(400).json({
//         success: false,
//         message: "Each screen_detail must contain user_id and user_role",
//       });
//       return;
//     }

//     const isDeleted =
//       await UserRoleAccessService.deleteUserRoleMappingsWithTransaction(
//         screen_details
//       );

//     if (!isDeleted) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "No role assignments were deleted",
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       message: "Role access was successfully revoked.",
//     });
//   } catch (error: any) {
//     console.error("Error in deleterollaccess:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== ADDITIONAL APIS ====================

// // Get role with assigned users
// export const getRoleAssignedUsers = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { user_role } = req.params;

//     if (!user_role) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "user_role parameter is required",
//       });
//       return;
//     }

//     const role = await UserRoleAccessService.getRoleWithAssignedUsers(
//       user_role
//     );

//     if (!role) {
//       res.status(constants.STATUS_CODES.NOT_FOUND).json({
//         success: false,
//         message: "Role not found",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: role,
//     });
//   } catch (error: any) {
//     console.error("Error in getRoleAssignedUsers:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Bulk create role assignments
// export const createMultipleRoleAssignments = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { mappings } = req.body;

//     if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "Please provide mappings array",
//       });
//       return;
//     }

//     // Validate each mapping
//     for (const mapping of mappings) {
//       const { error } = MsPsUserRoleMappingSchema(mapping);
//       if (error) {
//         res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//           success: false,
//           message: `Validation error for mapping: ${error.message}`,
//         });
//         return;
//       }
//     }

//     const createdMappings =
//       await UserRoleAccessService.createMultipleUserRoleMappingsWithTransaction(
//         mappings
//       );

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: `${createdMappings.length} role assignments created successfully`,
//       data: createdMappings,
//     });
//   } catch (error: any) {
//     console.error("Error in createMultipleRoleAssignments:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Get user role mappings
// export const getUserRoleMappings = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { user_id } = req.params;

//     if (!user_id) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "user_id parameter is required",
//       });
//       return;
//     }

//     const mappings = await UserRoleAccessService.getUserRoleMappingsByUser(
//       user_id
//     );

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: mappings,
//     });
//   } catch (error: any) {
//     console.error("Error in getUserRoleMappings:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
