// import { Response } from "express";
// import { RequestWithUser } from "../../interfaces/common.interface";
// import { IUser } from "../../interfaces/user.interface";
// import constants from "../../helpers/constants";
// import { MSPSProjectMasterschema } from "../../validation/Security/Security.validation";
// import { ScreenAccessService } from "./../../services/Security/screenaccess.service";

// // ==================== CREATE SCREEN ACCESS ====================
// export const createscreenacess = async (
//   req: RequestWithUser,
//   res: Response
// ) => {
//   try {
//     const { error } = MSPSProjectMasterschema(req.body);
//     if (error) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: error.message,
//       });
//       return;
//     }

//     const { user_id, project_code } = req.body;

//     // Validate user and project exist
//     const { userExists, projectExists } =
//       await ScreenAccessService.validateUserAndProjectExist(
//         user_id,
//         project_code
//       );

//     if (!userExists) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "User not found",
//       });
//       return;
//     }

//     if (!projectExists) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "Project not found",
//       });
//       return;
//     }

//     const assignment = await ScreenAccessService.createProjectUserAssignment(
//       user_id,
//       project_code
//     );

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: "Project successfully assigned to the user.",
//       data: assignment,
//     });
//   } catch (error: any) {
//     console.error("Error in createscreenacess:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== GET USER ASSIGNED PROJECTS ====================
// export const getUserAssignedProjects = async (
//   req: RequestWithUser,
//   res: Response
// ) => {
//   try {
//     console.log("Fetching projects for user:", req.params);
//     const { user_id } = req.params;

//     if (!user_id) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "user_id parameter is required",
//       });
//       return;
//     }

//     const projects =
//       await ScreenAccessService.getUserAssignedProjectsSimplified(user_id);

//     if (projects.length === 0) {
//       res.status(constants.STATUS_CODES.NOT_FOUND).json({
//         success: false,
//         message: "No projects found for this user",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: projects,
//     });
//   } catch (error: any) {
//     console.error("Error in getUserAssignedProjects:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ==================== DELETE SCREEN ACCESS ====================
// export const deleteScreenaccess = async (
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
//           "Please provide at least one user id and project code to delete",
//       });
//       return;
//     }

//     // Validate screen_details structure
//     const invalidEntries = screen_details.filter(
//       (detail: any) => !detail.user_id || !detail.project_code
//     );

//     if (invalidEntries.length > 0) {
//       res.status(400).json({
//         success: false,
//         message: "Each screen_detail must contain user_id and project_code",
//       });
//       return;
//     }

//     const isDeleted =
//       await ScreenAccessService.deleteProjectUserAssignmentsWithTransaction(
//         screen_details
//       );

//     if (!isDeleted) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "No project assignments were deleted",
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       message: "Project access was successfully revoked.",
//     });
//     return;
//   } catch (error: any) {
//     console.error("Error in deleteScreenaccess:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//     return;
//   }
// };

// // ==================== ADDITIONAL APIS ====================

// // Get project with assigned users
// export const getProjectAssignedUsers = async (
//   req: RequestWithUser,
//   res: Response
// ) => {
//   try {
//     const { project_code } = req.params;

//     if (!project_code) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "project_code parameter is required",
//       });
//       return;
//     }

//     const project = await ScreenAccessService.getProjectWithAssignedUsers(
//       project_code
//     );

//     if (!project) {
//       res.status(constants.STATUS_CODES.NOT_FOUND).json({
//         success: false,
//         message: "Project not found",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: project,
//     });
//   } catch (error: any) {
//     console.error("Error in getProjectAssignedUsers:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Bulk create project assignments
// export const createMultipleProjectAssignments = async (
//   req: RequestWithUser,
//   res: Response
// ) => {
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
//       const { error } = MSPSProjectMasterschema(assignment);
//       if (error) {
//         res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//           success: false,
//           message: `Validation error for assignment: ${error.message}`,
//         });
//         return;
//       }
//     }

//     const createdAssignments =
//       await ScreenAccessService.createMultipleProjectAssignmentsWithTransaction(
//         assignments
//       );

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: `${createdAssignments.length} project assignments created successfully`,
//       data: createdAssignments,
//     });
//   } catch (error: any) {
//     console.error("Error in createMultipleProjectAssignments:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
