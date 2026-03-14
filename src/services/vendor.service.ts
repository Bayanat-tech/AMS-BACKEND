import axios from "axios";
import https from "https";
import { oracleDb } from "../database/connection";
import { getRepository } from "../database/connection";
import { Vendor } from "../entity/Vendor";


const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const API_BASE_URL = process.env.NET_API_BASE_URL?.trim();
const API_KEY = process.env.NET_API_KEY?.trim();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  httpsAgent,
  headers: {
    XApiKey: API_KEY,
    "Content-Type": "application/json",
    accept: "*/*",
  },
  timeout: 30000,
  validateStatus: (status) => status < 500,
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (config.headers) {
      delete config.headers["ApiKey"];
      delete config.headers["apikey"];
      delete config.headers["x-api-key"];
      delete config.headers["X-API-KEY"];
      config.headers["XApiKey"] = API_KEY;
    }

    console.log("Final Request Headers:", config.headers);
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    console.log("Response Headers:", response.headers);
    console.log("Response Status:", response.status);
    return response;
  },
  (error) => {
    console.error("Detailed API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      requestHeaders: error.config?.headers,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseHeaders: error.response?.headers,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
);

function cleanDetail(detail: Record<string, any>): Record<string, any> {
  const cleanedDetail = { ...detail };

  for (const key in cleanedDetail) {
    if (cleanedDetail[key] === "") {
      // Convert empty strings to null for known number/date columns
      if (
        [
          "QTY",
          "PRICE",
          "AMOUNT",
          "DOC_NO",
          "SERIAL_NO",
          "DOC_DATE",
          "EX_RATE",
          "LCUR_AMOUNT",
        ].includes(key)
      ) {
        cleanedDetail[key] = null;
      }
    }

    // Format dates to yyyy-MM-dd
    if (
      key.endsWith("DATE") &&
      typeof cleanedDetail[key] === "string" &&
      cleanedDetail[key]
    ) {
      const parts = cleanedDetail[key].split("/");
      if (parts.length === 3) {
        cleanedDetail[key] = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Ensure numbers are sent as numbers
    if (
      ["QTY", "PRICE", "AMOUNT", "EX_RATE", "LCUR_AMOUNT"].includes(key) &&
      typeof cleanedDetail[key] === "string"
    ) {
      cleanedDetail[key] = parseFloat(cleanedDetail[key]) || null;
    }
  }

  return cleanedDetail;
}

export class VendorService {
  private static getVendorRepository() {
    return getRepository(Vendor);
  }

  static async findByCompanyAndVendorCode(
    companyCode: string,
    vendorCode: string
  ) {
    const repo = this.getVendorRepository();
    return await repo.findOne({
      where: { COMPANY_CODE: companyCode, VENDOR_CODE: vendorCode },
    });
  }

  static async createVendor(data: Partial<Vendor>) {
    const repo = this.getVendorRepository();
    const vendor = repo.create(data);
    return await repo.save(vendor);
  }

  static async updateVendor(
    companyCode: string,
    vendorCode: string,
    data: Partial<Vendor>
  ) {
    const repo = this.getVendorRepository();
    return await repo.update(
      { COMPANY_CODE: companyCode, VENDOR_CODE: vendorCode },
      data
    );
  }

  static async getdynamicdata(vs_parameter: string, vs_where: string) {
    try {
      let vs_parameter1 = "TEST";
      let vs_where1 = "`1string` = 'ABC' AND `2string` = 'XYZ'";
      console.log("Calling dynamic query");
      const response = await axiosInstance.post(
        "/EmployeeLeave_/dynamicquery",
        {
          vs_parameter1,
          vs_where1,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getdynamicdata:", error.message);
      throw new Error(`Failed to fetch dynamic data: ${error.message}`);
    }
  }

  static async getAccountsList(companyCode?: string, acCode?: string) {
    try {
      console.log("Calling ACCOUNTS_LIST endpoint");
      const response = await axiosInstance.get(
        "/VENDOR_SYSTEM_/ACCOUNTS_LIST",
        {
          params: {
            company_code: companyCode || undefined,
            ac_code: acCode || undefined,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getAccountsList:", error.message);
      throw new Error(`Failed to fetch accounts list: ${error.message}`);
    }
  }

  static async getDivisionList() {
    const response = await axiosInstance.get("/VENDOR_SYSTEM_/DIVISION_LIST");
    return response.data;
  }

  static async getPendingLPOList(company_code: string, ac_code: string) {
    const response = await axiosInstance.get(
      "/VENDOR_SYSTEM_/LPO_PENDING_LIST",
      {
        params: { company_code, ac_code },
      }
    );
    return response.data;
  }

  static async getPendingLPODetail(
    company_code: string,
    ac_code: string,
    doc_no: string
  ) {
    const response = await axiosInstance.get(
      "/VENDOR_SYSTEM_/LPO_PENDING_DETAIL",
      {
        params: { company_code, ac_code, doc_no },
      }
    );
    return response.data;
  }

  static async insertAcHeader(headerData: Record<string, any>) {
    // Clean the header data before sending
    const cleanedData = cleanDetail(headerData);

    // Send the request to the .NET API
    const response = await axiosInstance.post(
      "/VENDOR_SYSTEM_/INSERT_AC_HEADER",
      cleanedData
    );
    return response.data;
  }

  static async insertAcDetail(detailData: Record<string, any>) {
    // Clean the detail data before sending
    const cleanedData = cleanDetail(detailData);

    // Log the payload being sent
    console.log("Sending Detail Payload:", cleanedData);

    try {
      // Send the request to the .NET API
      const response = await axiosInstance.post(
        "/VENDOR_SYSTEM_/INSERT_AC_DETAIL",
        cleanedData
      );

      // Log the response for debugging
      console.log("Response from .NET API:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      return response.data;
    } catch (error: any) {
      // Log detailed error information
      console.error("Error sending detail to .NET API:", {
        url: error.config?.url,
        method: error.config?.method,
        requestHeaders: error.config?.headers,
        payload: cleanedData,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseHeaders: error.response?.headers,
        responseData: error.response?.data,
        message: error.message,
      });

      throw error;
    }
  }

  static async insertUploadedFile(fileData: Record<string, any>) {
    try {
      // Log the payload being sent
      console.log("Sending File Data Payload:", fileData);

      // Send the request to the .NET API
      const response = await axiosInstance.post(
        "/VENDOR_SYSTEM_/INSERT_UPLOADED_FILE",
        fileData
      );

      // Log the response for debugging
      console.log("Response from .NET API:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      return response.data;
    } catch (error: any) {
      // Log detailed error information
      console.error("Error sending file data to .NET API:", {
        url: error.config?.url,
        method: error.config?.method,
        requestHeaders: error.config?.headers,
        payload: fileData,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseHeaders: error.response?.headers,
        responseData: error.response?.data,
        message: error.message,
      });

      throw new Error(`Failed to insert uploaded file data: ${error.message}`);
    }
  }

  static async insertVendor(vendorData: Record<string, any>) {
    // Clean and validate vendor data
    const cleanedData = cleanDetail(vendorData);

    // Log the payload being sent
    console.log("Sending Vendor Data Payload:", cleanedData);

    try {
      // Send the request to the .NET API
      const response = await axiosInstance.post(
        "/VENDOR_SYSTEM_/INSERT_VENDOR",
        cleanedData
      );

      // Log the response for debugging
      console.log("Response from .NET API:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      return response.data;
    } catch (error: any) {
      // Log detailed error information
      console.error("Error sending vendor data to .NET API:", {
        url: error.config?.url,
        method: error.config?.method,
        requestHeaders: error.config?.headers,
        payload: cleanedData,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseHeaders: error.response?.headers,
        responseData: error.response?.data,
        message: error.message,
      });

      // If the error contains field validation details, include them in the error
      if (error.response?.data?.Error && error.response?.data?.Fields) {
        throw new Error(
          `Validation error: ${
            error.response.data.Error
          } - Missing fields: ${error.response.data.Fields.join(", ")}`
        );
      }

      throw error;
    }
  }

  // FIXED: Use oracleDb instead of sequelize
  static async updateDataTransferFlag(companyCode: string, docNo: string) {
    try {
      const result = await oracleDb.query(
        `UPDATE TR_AC_LPO_HEADER
         SET DATA_TRANSFER = 'Y'
         WHERE COMPANY_CODE = :companyCode 
         AND DOC_NO = :docNo`,
        {
          companyCode: { val: companyCode },
          docNo: { val: docNo },
        }
      );
      console.log("Update result:", result);
    } catch (error) {
      console.error("Update data transfer flag error:", error);
      throw error;
    }
  }

  static async checkAccountEmployee(userId: string) {
    try {
      const response = await axiosInstance.get(
        "/VENDOR_SYSTEM_/checkAccountEmployee",
        {
          params: { p_userid: userId },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in checkAccountEmployee:", error.message);
      if (error.response?.status === 401) {
        throw new Error(
          "Unauthorized access to external system. Please check API credentials."
        );
      }
      throw new Error(
        `Failed to fetch account employee info: ${error.message}`
      );
    }
  }

  static async getPartyAccountStatement(
    companyCode: string,
    acCode: string,
    docDateFrom: string,
    docDateTo: string
  ) {
    try {
      const response = await axiosInstance.get(
        "/VENDOR_SYSTEM_/getPartyAccountStatement",
        {
          params: {
            company_code: companyCode,
            ac_code: acCode,
            doc_date_from: docDateFrom,
            doc_date_to: docDateTo,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getPartyAccountStatement:", error.message);
      throw new Error(
        `Failed to fetch party account statement: ${error.message}`
      );
    }
  }

  static async getPartyOutstanding(companyCode: string, acCode: string) {
    try {
      const response = await axiosInstance.get(
        "/VENDOR_SYSTEM_/getPartyOutstanding",
        {
          params: {
            company_code: companyCode,
            ac_code: acCode,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getPartyOutstanding:", error.message);
      throw new Error(`Failed to fetch party outstanding: ${error.message}`);
    }
  }

  static async getInvoiceStatus(
    companyCode: string,
    acCode: string,
    poDateFrom: string,
    poDateTo: string
  ) {
    try {
      const response = await axiosInstance.get(
        "/VENDOR_SYSTEM_/getInvoiceStatus",
        {
          params: {
            company_code: companyCode,
            ac_code: acCode,
            po_date_from: poDateFrom,
            po_date_to: poDateTo,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getInvoiceStatus:", error.message);
      throw new Error(`Failed to fetch invoice status: ${error.message}`);
    }
  }

  static async getTmpAcHeaderWithErpDocNo(loginid: string) {
    try {
      const response = await axiosInstance.get(
        "/VENDOR_SYSTEM_/TMP_AC_HEADER_WITH_ERP_DOC",
        {
          params: { loginid },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in getTmpAcHeaderWithErpDocNo:", error.message);
      throw new Error(
        `Failed to fetch TMP_AC_HEADER_WITH_ERP_DOC data: ${error.message}`
      );
    }
  }

  static cleanDetail(detail: Record<string, any>): Record<string, any> {
    const cleanedDetail = { ...detail };

    for (const key in cleanedDetail) {
      // Handle date fields
      if (key.endsWith("DATE") && cleanedDetail[key]) {
        try {
          const dateValue = cleanedDetail[key];
          if (typeof dateValue === "string") {
            // Remove any time component and standardize format
            const datePart = dateValue.split(/[\sT]/)[0];
            if (datePart.includes("/")) {
              const [day, month, year] = datePart.split("/");
              cleanedDetail[key] = `${year}-${month.padStart(
                2,
                "0"
              )}-${day.padStart(2, "0")}`;
            } else {
              cleanedDetail[key] = datePart;
            }
          }
        } catch (error) {
          console.error(`Error processing date for ${key}:`, error);
          cleanedDetail[key] = null;
        }
      }

      if (cleanedDetail[key] === "") {
        if (
          [
            "QTY",
            "PRICE",
            "AMOUNT",
            "DOC_NO",
            "SERIAL_NO",
            "DOC_DATE",
            "EX_RATE",
            "LCUR_AMOUNT",
          ].includes(key)
        ) {
          cleanedDetail[key] = null;
        }
      }

      // Ensure numbers are sent as numbers
      if (
        ["QTY", "PRICE", "AMOUNT", "EX_RATE", "LCUR_AMOUNT"].includes(key) &&
        typeof cleanedDetail[key] === "string"
      ) {
        cleanedDetail[key] = parseFloat(cleanedDetail[key]) || null;
      }
    }

    return cleanedDetail;
  }
}

