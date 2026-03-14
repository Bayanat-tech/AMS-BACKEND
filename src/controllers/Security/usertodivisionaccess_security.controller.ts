// import { Response } from "express";
// import { RequestWithUser } from "../../interfaces/common.interface";
// import constants from "../../helpers/constants";
// import { MSPsDivisionMasterschema } from "../../validation/Security/Security.validation";
// import { UserDivisionAccessService } from "../../services/Security/userdivisionaccess.service";

// // ==================== CREATE USER TO DIVISION ACCESS ====================
// export const createusertodivisionaccess = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { error } = MSPsDivisionMasterschema(req.body);
//     if (error) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: error.message,
//       });
//       return;
//     }

//     const { user_id, div_code } = req.body;

//     // Validate user and division exist
//     const { userExists, divisionExists } =
//       await UserDivisionAccessService.validateUserAndDivisionExist(
//         user_id,
//         div_code
//       );

//     if (!userExists) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "User not found",
//       });
//       return;
//     }

//     if (!divisionExists) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "Division not found",
//       });
//       return;
//     }

//     const assignment =
//       await UserDivisionAccessService.createUserDivisionAssignment({
//         user_id,
//         div_code,
//         divn_code: div_code,
//       });

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: "Division successfully assigned to the user.",
//       data: assignment,
//     });
//   } catch (error: any) {
//     console.error("Error in createusertodivisionaccess:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== GET USER ASSIGNED DIVISIONS ====================
// export const getUserAssigneddivision = async (
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

//     const divisions =
//       await UserDivisionAccessService.getUserAssignedDivisionsSimplified(
//         user_id
//       );

//     if (divisions.length === 0) {
//       res.status(constants.STATUS_CODES.NOT_FOUND).json({
//         success: false,
//         message: "No divisions found for this user",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: divisions,
//     });
//   } catch (error: any) {
//     console.error("Error in getUserAssigneddivision:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== DELETE DIVISION ACCESS ====================
// export const deletedivisonaccess = async (
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
//         message: "Please provide at least one user id and div code to delete",
//       });
//       return;
//     }

//     // Validate screen_details structure
//     const invalidEntries = screen_details.filter(
//       (detail: any) => !detail.user_id || !detail.div_code
//     );

//     if (invalidEntries.length > 0) {
//       res.status(400).json({
//         success: false,
//         message: "Each screen_detail must contain user_id and div_code",
//       });
//       return;
//     }

//     const isDeleted =
//       await UserDivisionAccessService.deleteUserDivisionAssignmentsWithTransaction(
//         screen_details
//       );

//     if (!isDeleted) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "No division assignments were deleted",
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       message: "Division access was successfully revoked.",
//     });
//   } catch (error: any) {
//     console.error("Error in deletedivisonaccess:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== ADDITIONAL APIS ====================

// // Get division with assigned users
// export const getDivisionAssignedUsers = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { div_code } = req.params;

//     if (!div_code) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "div_code parameter is required",
//       });
//       return;
//     }

//     const division =
//       await UserDivisionAccessService.getDivisionWithAssignedUsers(div_code);

//     if (!division) {
//       res.status(constants.STATUS_CODES.NOT_FOUND).json({
//         success: false,
//         message: "Division not found",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: division,
//     });
//   } catch (error: any) {
//     console.error("Error in getDivisionAssignedUsers:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Bulk create division assignments
// export const createMultipleDivisionAssignments = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { assignments } = req.body;

//     if (
//       !assignments ||
//       !Array.isArray(assignments) ||
//       assignments.length === 0
//     ) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "Please provide assignments array",
//       });
//       return;
//     }

//     // Validate each assignment
//     for (const assignment of assignments) {
//       const { error } = MSPsDivisionMasterschema(assignment);
//       if (error) {
//         res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//           success: false,
//           message: `Validation error for assignment: ${error.message}`,
//         });
//         return;
//       }
//     }

//     const createdAssignments =
//       await UserDivisionAccessService.createMultipleUserDivisionAssignmentsWithTransaction(
//         assignments
//       );

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: `${createdAssignments.length} division assignments created successfully`,
//       data: createdAssignments,
//     });
//   } catch (error: any) {
//     console.error("Error in createMultipleDivisionAssignments:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Get user division assignments
// export const getUserDivisionAssignments = async (
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

//     const assignments =
//       await UserDivisionAccessService.getUserDivisionAssignmentsByUser(user_id);

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: assignments,
//     });
//   } catch (error: any) {
//     console.error("Error in getUserDivisionAssignments:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
