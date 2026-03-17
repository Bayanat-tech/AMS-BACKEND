import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { FaceRecognitionService } from "../../services/Attendance/face_recognition.service";
import logger from "../../utils/logger";
import { validateImage } from "../../middleware/security.middleware";
import { EmployeeService } from "../../services/Attendance/employee.service";
import { AppDataSource } from "../../database/connection";
import { Employee } from "../../entity/Attendance/employee.entity";
import { EmployeeFace } from "../../entity/Attendance/employee_face.entity";
import { uploadFile } from "../../services/ociUpload.service";

export class EmployeeController {
  static async registerEmployee(req: Request, res: Response): Promise<void> {
  try {
    const company_code = (req as any).user?.company_code;
    if (!company_code) {
      logger.warn("Employee registration attempt without company_code");
      res.status(400).json({ error: "Company code is required" });
      return;
    }

    const {
      employee_id,
      employee_code,
      full_name,
      email,
      department,
      position,
      hire_date,
      phone_number,
    } = req.body;
    const files = req.files as Express.Multer.File[];

    const EmployeeRecord = AppDataSource.getRepository(Employee);
    const Face = AppDataSource.getRepository(EmployeeFace);

    const existingEmployee = await EmployeeRecord.findOne({
      where: { employee_id, company_code },
    });
    if (existingEmployee) {
      logger.warn(
        `Registration attempt with duplicate employee_id: ${employee_id}`
      );
      res.status(400).json({ 
        success: false,
        error: "Employee already registered with this ID",
        message: "Employee already registered with this ID" 
      });
      return;
    }

    if (!files || files.length === 0) {
      logger.warn("Employee registration attempt without images");
      res.status(400).json({ 
        success: false,
        error: "At least one employee photo is required",
        message: "At least one employee photo is required"
      });
      return;
    }

    // Validate each image
    for (const file of files) {
      req.file = file;
      validateImage(req, res, () => {});
    }
    const employee = EmployeeRecord.create({
      id: uuidv4(),
      company_code,
      employee_id,
      employee_code,
      full_name,
      email,
      department,
      position,
      hire_date: new Date(hire_date),
      phone_number,
    });
    await EmployeeRecord.save(employee);

    const faceService = await FaceRecognitionService.getInstance();

    // Process each image
    let savedFaces = 0;
    for (const file of files) {
      const s3Key = `employee_faces/${employee_id}/${uuidv4()}.jpg`;
      try {
        await uploadFile(file.buffer, s3Key, file.mimetype);
        const descriptor = await faceService.extractFaceDescriptor(file.buffer);
        // Validate descriptor shape (should be 128 floats)
        if (!Array.isArray(descriptor) || descriptor.length !== 128 || !descriptor.every((n: any) => Number.isFinite(n))) {
          logger.warn(`Invalid descriptor extracted for employee ${employee_id}; skipping this image`, {
            fileName: file.originalname,
            descriptorLength: Array.isArray(descriptor) ? descriptor.length : typeof descriptor,
          });
          continue;
        }

        const face = Face.create({
          id: uuidv4(),
          company_code,
          employee_id,
          s3_key: s3Key,
          descriptor: JSON.stringify(descriptor),
          is_active: "1",
        });
        await Face.save(face);
        savedFaces++;
      } catch (err: any) {
        logger.warn(`Face processing failed for employee ${employee_id}`, {
          fileName: file.originalname,
          error: err?.message || err,
        });
        // continue processing other images
      }
    }

    // If none of the provided images produced a descriptor, roll back employee creation
    if (savedFaces === 0) {
      logger.error(`Employee registration failed: no valid face images for ${employee_id}`);
      // remove created employee record
      try {
        await EmployeeRecord.delete({ employee_id });
      } catch (delErr) {
        logger.error('Failed to delete employee after face failures', delErr);
      }
      res.status(400).json({
        success: false,
        error: 'No valid face images were provided. Registration aborted.',
      });
      return;
    }

    // Clear face matcher cache so newly registered faces are used immediately
    try {
      faceService.clearFaceMatcherCache();
    } catch (cacheErr) {
      logger.warn('Failed to clear face matcher cache after registration (non-fatal)', cacheErr);
    }

    logger.info(`Employee ${employee_id} registered successfully`);
    res.status(201).json({ success: true, employeeId: employee_id });
  } catch (error: any) {
    logger.error("Employee registration failed", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: error.message 
    });
  }
}

  // static async getEmployees(req: Request, res: Response): Promise<void> {
  //   try {
  //     const employees = await Employee.findAll({
  //       order: [["full_name", "ASC"]],
  //     });
  //     res.status(200).json(employees);
  //   } catch (error: any) {
  //     logger.error("Failed to fetch employees", error);
  //     res.status(500).json({ success: false, message: error.message });
  //   }
  // }

  static async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const company_code = (req as any).user?.company_code;
      if (!company_code) {
        logger.warn("Get employees attempt without company_code");
        res.status(400).json({ error: "Company code is required" });
        return;
      }

      const employeeRepository = AppDataSource.getRepository(Employee);

      const employees = await employeeRepository.find({
        where: { company_code },
        order: {
          full_name: "ASC", 
        },
      });

      res.status(200).json(employees);
    } catch (error: any) {
      logger.error("Failed to fetch employees", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async modifyEmployee(req: Request, res: Response ): Promise<void> {
    try {
      const company_code = (req as any).user?.company_code;
      if (!company_code) {
        logger.warn("Modify employee attempt without company_code");
        res.status(400).json({ error: "Company code is required" });
        return;
      }

      const { employee_id } = req.params;
      const {
        full_name,
        email,
        department,
        position,
        hire_date,
        phone_number,
      } = req.body;
      const files = req.files as Express.Multer.File[];

      const EmployeesFace = AppDataSource.getRepository(EmployeeFace);
      const repo = AppDataSource.getRepository(Employee);

      // Find employee
      const employee = await repo.findOne({
        where: { employee_id: employee_id as string, company_code },
      });

      if (!employee) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      Object.assign(employee, {
      full_name: req.body.full_name ?? employee.full_name,
      email: req.body.email ?? employee.email,
      department: req.body.department ?? employee.department,
      position: req.body.position ?? employee.position,
      hire_date: req.body.hire_date ? new Date(req.body.hire_date) : employee.hire_date,
      phone_number: req.body.phone_number ?? employee.phone_number,
    });

      await repo.save(employee);

      if (files && files.length > 0) {
        const faceService = await FaceRecognitionService.getInstance();

        // Process new images first and collect successful faces
        const newFaces: Array<{
          id: string;
          employee_id: string;
          s3_key: string;
          descriptor: string;
          is_active: string;
        }> = [];

        for (const file of files) {
          req.file = file;
          validateImage(req, res, () => {});

          const s3Key = `employee_faces/${employee_id}/${uuidv4()}.jpg`;
          try {
            await uploadFile(file.buffer, s3Key, file.mimetype);
            const descriptor = await faceService.extractFaceDescriptor(file.buffer);
            if (!Array.isArray(descriptor) || descriptor.length !== 128 || !descriptor.every((n: any) => Number.isFinite(n))) {
              logger.warn(`Invalid descriptor extracted during modify for employee ${employee_id}; skipping this image`, {
                fileName: file.originalname,
                descriptorLength: Array.isArray(descriptor) ? descriptor.length : typeof descriptor,
              });
              continue;
            }

            newFaces.push({
              id: uuidv4(),
              employee_id: employee_id as string,
              s3_key: s3Key,
              descriptor: JSON.stringify(descriptor),
              is_active: "1",
            });
          } catch (err: any) {
            logger.warn(`Face processing failed for employee ${employee_id}`, {
              fileName: file.originalname,
              error: err?.message || err,
            });
            // continue processing other images
          }
        }

        if (newFaces.length === 0) {
          logger.warn(`No valid new face images uploaded for ${employee_id}; keeping existing faces active.`);
          res.status(400).json({ success: false, error: 'No valid face images were provided. Employee not modified.' });
          return;
        }

        // Deactivate old faces and save new ones
        await EmployeesFace.update({ employee_id: employee_id as string }, { is_active: "0" });
        for (const f of newFaces) {
          const faceEntity = EmployeesFace.create(f as any);
          await EmployeesFace.save(faceEntity);
        }
        // Clear face matcher cache so updated faces are picked up immediately
        try {
          faceService.clearFaceMatcherCache();
        } catch (cacheErr) {
          logger.warn('Failed to clear face matcher cache after modification (non-fatal)', cacheErr);
        }
      }

      logger.info(`Employee ${employee_id} updated successfully`);
      res.status(200).json({ success: true, employeeId: employee_id });
    } catch (error: any) {
      logger.error("Employee modification failed", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getEmployeeInfo(req: Request, res: Response): Promise<void> {
    try {
      const { employee_code, name } = req.query;

      if (!employee_code && !name) {
        res.status(400).json({
          error: "Either employee_code or name parameter is required",
        });
        return;
      }

      const employeeInfo = await EmployeeService.getEmployeeInfo({
        employee_code: employee_code as string,
        name: name as string,
      });

      res.status(200).json(employeeInfo);
    } catch (error: any) {
      logger.error("Failed to fetch employee info", error);
      res.status(500).json({
        error: "Failed to fetch employee information",
        details: error.message,
      });
    }
  }

  static async getEmployeeInfoBayanatDb(req: Request, res: Response): Promise<void> {
    try {
      const { employee_code, name } = req.query;

      if (!employee_code && !name) {
        res.status(400).json({
          error: "Either employee_code or name parameter is required",
        });
        return;
      }

      const employeeInfo = await EmployeeService.getEmployeeInfoBayanatDb({
        employee_code: employee_code as string,
        name: name as string,
      });

      res.status(200).json(employeeInfo);
    } catch (error: any) {
      logger.error("Failed to fetch employee info (BayanatDb)", error);
      res.status(500).json({
        error: "Failed to fetch employee information from BayanatDb",
        details: error.message,
      });
    }
  }
  

}