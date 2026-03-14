// import { Response } from "express";
// import { RequestWithUser } from "../../interfaces/common.interface";
// import { IUser } from "../../interfaces/user.interface";
// import constants from "../../helpers/constants";
// import { flowmasterSchema } from "../../validation/Security/Security.validation";
// import { FlowMasterService } from "./../../services/Security/flowmaster.service";

// export const createflowmaster = async (req: RequestWithUser, res: Response) => {
//   try {
//     const requestUser: IUser = req.user;

//     const { error } = flowmasterSchema(req.body);
//     console.log("inside create");
//     if (error) {
//       res
//         .status(constants.STATUS_CODES.BAD_REQUEST)
//         .json({ success: false, message: error.message });
//       return;
//     }

//     const { flow_description, company_code } = req.body;

//     const duplicateFlow = await FlowMasterService.findByDescriptionAndCompany(
//       flow_description,
//       company_code
//     );

//     if (duplicateFlow) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: constants.MESSAGES.FLOWMASTER_PF.FLOWMASTER_ALREADY_EXISTS,
//       });
//       return;
//     }

//     // Create flow
//     const createdFlow = await FlowMasterService.createFlow({
//       flow_description,
//       company_code,
//       created_by: requestUser.loginid,
//       updated_by: requestUser.loginid,
//     });

//     if (!createdFlow) {
//       res
//         .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ success: false, message: "Error while creating flow" });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: constants.MESSAGES.FLOWMASTER_PF.FLOWMASTER_CREATED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     console.error("Error in createflowmaster:", error);
//     res
//       .status(constants.STATUS_CODES.BAD_REQUEST)
//       .json({ success: false, message: error.message });
//   }
// };

// export const updateflowmaster = async (req: RequestWithUser, res: Response) => {
//   try {
//     const requestUser: IUser = req.user;

//     const { error } = flowmasterSchema(req.body);
//     if (error) {
//       res
//         .status(constants.STATUS_CODES.BAD_REQUEST)
//         .json({ success: false, message: error.message });
//       return;
//     }

//     const { flow_code, company_code } = req.body;

//     // Check if flow exists
//     const existingFlow = await FlowMasterService.findByFlowCodeAndCompany(
//       flow_code,
//       company_code
//     );

//     if (!existingFlow) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: constants.MESSAGES.FLOWMASTER_PF.FLOWMASTER_DOES_NOT_EXISTS,
//       });
//       return;
//     }

//     // Update flow
//     const updateData = {
//       ...req.body,
//       updated_by: requestUser.loginid,
//     };

//     const isUpdated = await FlowMasterService.updateFlow(
//       flow_code,
//       company_code,
//       updateData
//     );

//     if (!isUpdated) {
//       res
//         .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
//         .json({ success: false, message: "Error while updating flow" });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: constants.MESSAGES.FLOWMASTER_PF.FLOWMASTER_UPDATED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     console.error("Error in updateflowmaster:", error);
//     res
//       .status(constants.STATUS_CODES.BAD_REQUEST)
//       .json({ success: false, message: error.message });
//   }
// };

// export const deleteflowmaster = async (req: RequestWithUser, res: Response) => {
//   try {
//     const { flow_codes } = req.body;

//     if (!flow_codes || !Array.isArray(flow_codes) || flow_codes.length === 0) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message:
//           constants.MESSAGES.FLOWMASTER_PF.SELECT_AT_LEAST_ONE_FLOWMASTER,
//       });
//       return;
//     }

//     const isDeleted = await FlowMasterService.deleteFlows(flow_codes);

//     if (!isDeleted) {
//       res.status(constants.STATUS_CODES.BAD_REQUEST).json({
//         success: false,
//         message: "No flows were deleted",
//       });
//       return;
//     }

//     res.status(constants.STATUS_CODES.OK).json({
//       success: true,
//       message: constants.MESSAGES.FLOWMASTER_PF.FLOWMASTER_DELETED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     console.error("Error in deleteflowmaster:", error);
//     res
//       .status(constants.STATUS_CODES.BAD_REQUEST)
//       .json({ success: false, message: error.message });
//   }
// };
