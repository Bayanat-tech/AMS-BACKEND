// import { Response } from "express";
// import { RequestWithUser } from "../../interfaces/common.interface";
// import { IUser } from "../../interfaces/user.interface";
// import constants from "../../helpers/constants";
// import { SecurityMasterService } from "./../../services/Security/securitymaster.service";

// export const getSecMaster = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { master } = req.params;
//     const requestUser: IUser = req.user;
//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 20;

//     const filter = req.query.filter
//       ? JSON.parse(req.query.filter as string)
//       : {};
//     const sort = filter?.sort;

//     let result: { tableData: any[]; count: number } = {
//       tableData: [],
//       count: 0,
//     };

//     console.log("Fetching master data for:", master);

//     switch (master) {
//       case "flow_master":
//         result = await SecurityMasterService.getFlowMaster(
//           requestUser.company_code,
//           page,
//           limit,
//           sort,
//           filter.search
//         );
//         break;

//       case "role_master":
//         result = await SecurityMasterService.getRoleMaster(
//           requestUser.company_code,
//           page,
//           limit,
//           sort,
//           filter.search
//         );
//         break;

//       case "sec_login":
//         result = await SecurityMasterService.getSecLogin(
//           requestUser.company_code,
//           page,
//           limit,
//           sort,
//           filter.search
//         );
//         break;

//       case "sec_module_data":
//         result = await SecurityMasterService.getSecModuleData(
//           requestUser.company_code,
//           page,
//           limit,
//           sort,
//           filter.search
//         );
//         break;

//       case "sec_company":
//         result = await SecurityMasterService.getCompanyMaster(
//           requestUser.company_code,
//           page,
//           limit,
//           sort
//         );
//         break;

//       case "project_access":
//         result = await SecurityMasterService.getProjectAccess(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "projects":
//         result = await SecurityMasterService.getProjects(
//           requestUser.company_code,
//           page,
//           100
//         );
//         break;

//       case "user_role_access":
//         result = await SecurityMasterService.getUserRoleAccess(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "roles":
//         result = await SecurityMasterService.getRoles(
//           requestUser.company_code,
//           page,
//           100
//         );
//         break;

//       case "access_assign_role":
//         result = await SecurityMasterService.getAccessAssignRole(
//           requestUser.company_code,
//           page,
//           limit
//         );
//         break;

//       case "serialno":
//         result = await SecurityMasterService.getSerialNo(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "access_assign_user":
//         result = await SecurityMasterService.getAccessAssignUser(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "sec_module_dropdown":
//         result = await SecurityMasterService.getSecModuleDropdown(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "user_division_access":
//         result = await SecurityMasterService.getUserDivisionAccess(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "divisions":
//         result = await SecurityMasterService.getDivisions(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "report_master":
//         result = await SecurityMasterService.getReportMaster(
//           requestUser.company_code,
//           page,
//           200
//         );
//         break;

//       case "query_master":
//         result = await SecurityMasterService.getQueryMaster(
//           requestUser.company_code,
//           page,
//           limit,
//           sort
//         );
//         break;

//       default:
//         res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//           success: false,
//           message: `Unknown master type: ${master}`,
//         });
//         return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       data: result,
//     });
//   } catch (error: any) {
//     console.error("Error in getSecMaster:", error);
//     res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: "Error occurred while fetching data",
//     });
//   }
// };

// export const deleteSecMaster = async (
//   req: RequestWithUser,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { master } = req.params;
//     const requestUser: IUser = req.user;
//     const { ids } = req.body;

//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "IDs are required for deletion",
//       });
//       return;
//     }

//     const isDeleted = await SecurityMasterService.deleteMasterRecords(
//       master,
//       requestUser.company_code,
//       ids
//     );

//     if (!isDeleted) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "No records were deleted",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: "Record is successfully deleted.",
//     });
//   } catch (error: any) {
//     console.error("Error in deleteSecMaster:", error);
//     res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
