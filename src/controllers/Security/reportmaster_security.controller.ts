import { Response } from "express";
import { RequestWithUser } from "../../interfaces/common.interface";
import { IUser } from "../../interfaces/user.interface";
import constants from "../../helpers/constants";
import { MsReportMasterSchema } from "../../validation/Security/Security.validation";
import { ReportMasterService } from "../../services/Security/reportmaster.service";

export const createreportmaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;

    const { error } = MsReportMasterSchema(req.body);
    if (error) {
      res
        .status(constants.STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: error.message });
      return;
    }

    const { reportid, reportname, module, company_code } = req.body;

    // Check if report already exists by reportid, reportname, module
    const reportExists = await ReportMasterService.findByReportIdAndName(
      reportid,
      reportname,
      module
    );

    if (reportExists) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Report already exists.",
      });
      return;
    }

    // Check for duplicate report with company_code
    const duplicateReport = await ReportMasterService.findDuplicate({
      reportid,
      reportname,
      module,
      company_code,
    });

    if (duplicateReport) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: constants.MESSAGES.report_sec.REPORT_ALREADY_EXISTS,
      });
      return;
    }

    // Create report
    const createdReport = await ReportMasterService.createReport({
      reportid,
      reportname,
      module,
      company_code,
      created_by: requestUser.loginid,
      updated_by: requestUser.loginid,
    });

    if (!createdReport) {
      res
        .status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error while creating report" });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: constants.MESSAGES.report_sec.REPORT_CREATED_SUCCESSFULLY,
    });
  } catch (error: any) {
    console.error("Error in createreportmaster:", error);
    res
      .status(constants.STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: error.message });
  }
};

export const modifyreportmaster = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestUser: IUser = req.user;
    const { report_no } = req.body;

    if (!report_no) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Report number required.",
      });
      return;
    }

    const existingReport = await ReportMasterService.findByReportNo(report_no);

    if (!existingReport) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Report master not found.",
      });
      return;
    }

    // Update report
    const updateData = {
      reportname: req.body.reportname,
      module: req.body.module,
      reportid: req.body.reportid,
      updated_by: requestUser.loginid,
    };

    const filteredUpdateData = {
      ...Object.fromEntries(
        Object.entries(updateData).filter(
          ([key, value]) => value !== undefined && key !== "updated_by"
        )
      ),
      updated_by: requestUser.loginid,
    };

    const isUpdated = await ReportMasterService.updateReport(
      report_no,
      filteredUpdateData
    );

    if (!isUpdated) {
      res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update report master.",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Report master updated successfully.",
    });
  } catch (error: any) {
    console.error("Error in modifyreportmaster:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to update report master.",
    });
  }
};

export const getReportMaster = async (req: RequestWithUser, res: Response) => {
  try {
    const { reportname, report_no } = req.query;

    if (!reportname || !report_no) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Both reportname and report_no are required.",
      });
      return;
    }

    const report = await ReportMasterService.findByReportNameAndNo(
      reportname as string,
      Number(report_no)
    );

    if (!report) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Report not found.",
      });
      return;
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Error in getReportMaster:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
