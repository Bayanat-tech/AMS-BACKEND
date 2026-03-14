import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const validateImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Check magic numbers for image types
    const magicNumbers = {
      jpg: ["FFD8FF"],
      png: ["89504E47"],
      gif: ["47494638"],
    };

    const fileHeader = file.buffer.toString("hex", 0, 4).toUpperCase();
    const isValidImage = Object.values(magicNumbers).some((headers) =>
      headers.some((header) => fileHeader.startsWith(header))
    );

    if (!isValidImage) {
      logger.warn(`Invalid file type detected`);
      res.status(400).json({ error: "Invalid file type" });
      return;
    }

    if (typeof next === "function") {
      next();
    }
  } catch (error) {
    logger.error("File validation error:", error);
    res.status(500).json({ error: "File validation failed" });
  }
};
