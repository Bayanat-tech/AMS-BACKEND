import winston from "winston";
import { TransformableInfo } from "logform";

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format matching your existing message style
const logFormat = printf((info: TransformableInfo) => {
  return `${info.timestamp} [${info.level}]: ${info.message} ${
    info.stack ? `\n${info.stack}` : ""
  }`;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      handleExceptions: true,
    }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
  exitOnError: false,
});

// Add unhandled exception handling
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

export default logger;
