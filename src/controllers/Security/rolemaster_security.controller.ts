// import { Response } from "express";
// import { RequestWithUser } from "../../interfaces/common.interface";
// import { IUser } from "../../interfaces/user.interface";
// import constants from "../../helpers/constants";
// import { rolemasterSchema } from "../../validation/Security/Security.validation";
// import { RoleMasterService } from "../../services/Security/rolemaster.service";

// export const createrolemaster = async (req: RequestWithUser, res: Response) => {
//   try {
//     const requestUser: IUser = req.user;

//     const { error } = rolemasterSchema(req.body);
//     if (error) {
//       res
//         .status(constants.STATUS_CODES.BAD_REQUEST)
//         .json({ success: false, message: error.message });
//       return;
//     }

//     const { role_desc, remarks, company_code } = req.body;

//     const duplicateRole = await RoleMasterService.findByRoleDescAndCompany(
//       role_desc,
//       company_code
//     );

//     if (duplicateRole) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: constants.MESSAGES.ROLEMASTER_WMS.ROLEMASTER_ALREADY_EXISTS,
//       });
//       return;
//     }

//     // Create role
//     const createdRole = await RoleMasterService.createRole({
//       role_desc,
//       remarks,
//       company_code,
//       created_by: requestUser.loginid,
//       updated_by: requestUser.loginid,
//     });

//     if (!createdRole) {
//       res
//         .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ success: false, message: "Error while creating role" });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message:
//         constants.MESSAGES.ROLEMASTER_WMS.ROLEMASTER_CREATED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     console.error("Error in createrolemaster:", error);
//     res
//       .status(constants.STATUS_CODES.BAD_REQUEST)
//       .json({ success: false, message: error.message });
//   }
// };

// export const updaterolemaster = async (req: RequestWithUser, res: Response) => {
//   try {
//     const requestUser: IUser = req.user;

//     const { error } = rolemasterSchema(req.body);
//     if (error) {
//       res
//         .status(constants.STATUS_CODES.BAD_REQUEST)
//         .json({ success: false, message: error.message });
//       return;
//     }

//     const { role_id, company_code } = req.body;

//     // Check if role exists
//     const existingRole = await RoleMasterService.findByRoleIdAndCompany(
//       role_id,
//       company_code
//     );

//     if (!existingRole) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: constants.MESSAGES.ROLEMASTER_WMS.ROLEMASTER_DOES_NOT_EXISTS,
//       });
//       return;
//     }

//     // Update role
//     const updateData = {
//       ...req.body,
//       updated_by: requestUser.loginid,
//     };

//     const isUpdated = await RoleMasterService.updateRole(
//       role_id,
//       company_code,
//       updateData
//     );

//     if (!isUpdated) {
//       res
//         .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ success: false, message: "Error while updating role" });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message:
//         constants.MESSAGES.ROLEMASTER_WMS.ROLEMASTER_UPDATED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     console.error("Error in updaterolemaster:", error);
//     res
//       .status(constants.STATUS_CODES.BAD_REQUEST)
//       .json({ success: false, message: error.message });
//   }
// };

// export const deleterolemaster = async (req: RequestWithUser, res: Response) => {
//   try {
//     const { role_ids } = req.body;

//     if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message:
//           constants.MESSAGES.ROLEMASTER_WMS.SELECT_AT_LEAST_ONE_ROLEMASTER,
//       });
//       return;
//     }

//     const isDeleted = await RoleMasterService.deleteRoles(role_ids);

//     if (!isDeleted) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "No roles were deleted",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message:
//         constants.MESSAGES.ROLEMASTER_WMS.ROLEMASTER_DELETED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     console.error("Error in deleterolemaster:", error);
//     res
//       .status(constants.STATUS_CODES.BAD_REQUEST)
//       .json({ success: false, message: error.message });
//   }
// };
