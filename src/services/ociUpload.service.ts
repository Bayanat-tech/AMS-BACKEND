import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlFromSdk } from "@aws-sdk/s3-request-presigner";
import constants from "../helpers/constants";
import { UploadToS3ObjectInterface } from "../interfaces/common.interface";
import { response } from "express";
import logger from "../utils/logger";

// Configure S3 client for OCI S3 Compatibility API
const s3Client = new S3Client({
  region: constants.OCI_S3_COMPATIBILITY.REGION,
  endpoint: constants.OCI_S3_COMPATIBILITY.ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: constants.OCI_S3_COMPATIBILITY.ACCESS_KEY_ID,
    secretAccessKey: constants.OCI_S3_COMPATIBILITY.SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (req: any, res: any) => {
  const file = req.file;

  const fileName: string = `uploads/${new Date().getFullYear()}/${
    new Date().getMonth() + 1
  }/${file.originalname}`;

  const objectParams: UploadToS3ObjectInterface = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(objectParams));

    const URL: string = constants.OCI_S3_COMPATIBILITY.getObjectUrl(fileName);

    return res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: URL,
    });
  } catch (error: any) {
    return res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadPFToS3 = async (req: any, res: any) => {
  const file = req.file;
  const requestNumber = req.body.request_number;
  const requestType = req.body.type;

  const fileName: string = `PMSFiles/${requestType}/${new Date().getFullYear()}/${
    new Date().getMonth() + 1
  }/${requestNumber}/${file.originalname}`;
  

  const objectParams: UploadToS3ObjectInterface = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(objectParams));

    const URL: string = constants.OCI_S3_COMPATIBILITY.getObjectUrl(fileName);

    return res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: URL,
    });
  } catch (error: any) {
    return res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteFileFromS3 = async (awsFileLocation: string) => {
  const params = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: awsFileLocation,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete file from OCI: ${error.message}`);
    } else {
      throw new Error("Failed to delete file from OCI: Unknown error occurred");
    }
  }
};

// export const uploadEmployeeFace = async (buffer: Buffer,
//     key: string,) => {
//   // const file = req.file;
//   // const employeeId = req.body.employeeId;
  
//   const fileName: string = `employee_faces/${employeeId}/${file.originalname}`;

//   const objectParams: UploadToS3ObjectInterface = {
//     Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
//     Key: fileName,
//     Body: file.buffer,
//     ContentType: file.mimetype,
//   };


export const uploadFile = async (
  buffer: Buffer,
  key: string,
  originalname: string,
  // res: Response
): Promise<any> => {
  const objectParams: UploadToS3ObjectInterface = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: key,
    Body: buffer,
    ACL: "public-read",
    ContentType: "contentType",
  }

  try {
    await s3Client.send(new PutObjectCommand(objectParams));
    logger.info(`File uploaded to OCI Object Storage: ${key}`);
    return constants.OCI_S3_COMPATIBILITY.getObjectUrl(key);
  } catch (error) {
    logger.error("OCI upload failed", error);
    throw new Error(constants.MESSAGES.SOMETHING_WENT_WRONG);
  }
}

export const uploadEmployeeFace = async (
  buffer: Buffer,
  employeeId: string,
  originalname: string,
  // res: Response
): Promise<any> => {
  const fileName = `employee_faces/${employeeId}/${originalname}`;

  const objectParams: UploadToS3ObjectInterface = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: "image/jpeg", 
  };
  
  try {
    await s3Client.send(new PutObjectCommand(objectParams));
    const URL: string = constants.OCI_S3_COMPATIBILITY.getObjectUrl(fileName);
    logger.info(`📸 Employee face uploaded to S3: ${fileName}`);
    return URL;
  } catch (error: any) {
    logger.error(`❌ S3 upload failed for ${fileName}:`, error);
    throw error;
  }
};

export const deleteFile= async (key: string): Promise<void> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
      Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
      Key: key,
    }));
      logger.info(`File deleted from OCI Object Storage: ${key}`);
    } catch (error) {
      logger.error("OCI delete failed", error);
    throw new Error("Failed to delete file from OCI Object Storage");
  }
}

export const getSignedUrl = async (key: string, expiresIn = 3600): Promise<any> => {
  try {
    const command = new GetObjectCommand({
      Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrlFromSdk(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    logger.error("Failed to generate signed URL", error);
    throw new Error("Failed to generate signed URL for file");
  }
};

export const uploadVendorAttachmentToS3 = async (req: any, res: any) => {
  const file = req.file;
  const docNo = req.body.doc_no;

  const fileName: string = `VendorDocument/${docNo}/${file.originalname}`;

  const objectParams: UploadToS3ObjectInterface = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(objectParams));

    const URL: string = constants.OCI_S3_COMPATIBILITY.getObjectUrl(fileName);

    return res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: URL,
    });
  } catch (error: any) {
    return res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteVendorAttachmentFromS3 = async (req: any, res: any) => {
  const docNo = req.params.doc_no;
  const fileName = `VendorDocument/${docNo}`;

  const params = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    return res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    return res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadEmployeeAttachmentToS3 = async (req: any, res: any) => {
  const file = req.file;
  const requestNumber = req.body.request_number;

  const fileName: string = `LeaveDocument/${requestNumber}/${file.originalname}`;

  const objectParams: UploadToS3ObjectInterface = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(objectParams));

    const URL: string = constants.OCI_S3_COMPATIBILITY.getObjectUrl(fileName);

    return res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: URL,
    });
  } catch (error: any) {
    return res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteEmployeeAttachmentFromS3 = async (req: any, res: any) => {
  const empId = req.params.emp_id;
  const fileName = `LeaveDocument/${empId}`;

  const params = {
    Bucket: constants.OCI_S3_COMPATIBILITY.BUCKET_NAME,
    Key: fileName,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
    return res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    return res.status(constants.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};
