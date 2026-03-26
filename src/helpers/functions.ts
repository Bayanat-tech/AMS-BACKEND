import bcrypt from "bcrypt";
import {
  ButtonGroup,
  ComparePasswordInterface,
  CreateLogInterface,
  GenerateTokenInterface,
  GetFilterQueryInterface,
  SendEmailInterface,
  TreeNode,
} from "../interfaces/common.interface";
import jsonwebtoken from "jsonwebtoken";
import constants from "./constants";
import { StructuredResult } from "../interfaces/auth.interface";
import { TiPackdetSeriesService } from "../services/tiPackdetSeries.service";
import { LogService } from "../services/log.service";
import logger from "../utils/logger";
const nodemailer = require("nodemailer");
import {
  FindOptionsWhere,
  Like,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Between,
  Not,
  IsNull,
  Raw,
} from "typeorm";

// Function to compare a plain password with a hashed password
export const comparePassword = async (args: ComparePasswordInterface) => {
  const { password, hashedPassword } = args;
  const result = await bcrypt.compare(password, hashedPassword);
  return result;
};

// Function to generate a JSON Web Token (JWT)
export const generateToken = async (args: GenerateTokenInterface) => {
  const { username, email_id, loginid } = args;

  const token = jsonwebtoken.sign(
    {
      username,
      email_id,
      loginid,
    },
    constants.AUTHENTICATION.APP_SECRET,
    {
      expiresIn: "30d",
    }
  );
  return token;
};

export const buildTree = (
  data: any[],
  permission: StructuredResult
): TreeNode[] => {
  const tree: Record<string, TreeNode> = {};

  data.forEach((row) => {
    const APP_CODE = row.APP_CODE || row.app_code;
    const LEVEL1 = row.LEVEL1 || row.level1;
    const LEVEL2 = row.LEVEL2 || row.level2;
    const LEVEL3 = row.LEVEL3 || row.level3;
    const URL_PATH = row.URL_PATH || row.url_path;

    console.log("Processing row:", {
      APP_CODE,
      LEVEL1,
      LEVEL2,
      LEVEL3,
      URL_PATH,
    });

    if (!APP_CODE) {
      console.log("Skipping row - no APP_CODE found");
      return;
    }

    // If the APP_CODE node doesn't exist, create it
    if (!tree[APP_CODE]) {
      tree[APP_CODE] = {
        id: (permission[APP_CODE]?.serial_number ?? 0).toString(),
        title: APP_CODE,
        type: "collapse",
        icon: "AbcIcon",
        url_path: APP_CODE.toLowerCase(),
        children: [],
      };
    }

    // Ensure children is always an array
    if (!Array.isArray(tree[APP_CODE].children)) {
      tree[APP_CODE].children = [];
    }

    // Find or create LEVEL1 node
    let level1Node = tree[APP_CODE].children.find(
      (node) => node.title === LEVEL1
    );

    if (
      !level1Node &&
      LEVEL1 &&
      LEVEL2 !== "" &&
      LEVEL2 !== null &&
      LEVEL2 !== undefined
    ) {
      level1Node = {
        id: !!permission[APP_CODE]?.children[LEVEL1]?.serial_number.toString()
          ? permission[APP_CODE]?.children[LEVEL1]?.serial_number.toString()
          : Math.floor(Number(Math.random() * 100000)).toString(),
        url_path: APP_CODE.toLowerCase(),
        title: LEVEL1,
        type: "group",
        icon: "AbcIcon",
        children: [],
      };
      tree[APP_CODE]?.children!.push(level1Node);
      tree[APP_CODE].id =
        permission[APP_CODE]?.children[LEVEL1]?.serial_number.toString();
    }

    if (
      !level1Node &&
      LEVEL1 &&
      (LEVEL2 === "" || LEVEL2 === null || LEVEL2 === undefined)
    ) {
      level1Node = {
        id: !!permission[APP_CODE]?.children[LEVEL1]?.serial_number.toString()
          ? permission[APP_CODE]?.children[LEVEL1]?.serial_number.toString()
          : Math.floor(Number(Math.random() * 100000)).toString(),
        title: LEVEL1,
        type: "item",
        icon: "AbcIcon",
        url_path: URL_PATH || APP_CODE.toLowerCase(),
      };
      tree[APP_CODE]?.children!.push(level1Node);
      tree[APP_CODE].id =
        permission[APP_CODE]?.children[LEVEL1]?.serial_number.toString();
    }

    // If LEVEL2 exists and LEVEL1 node is found, find or create LEVEL2 node
    if (
      LEVEL2 &&
      level1Node &&
      LEVEL3 !== "" &&
      LEVEL3 !== null &&
      LEVEL3 !== undefined
    ) {
      let level2Node = level1Node?.children!.find(
        (node) => node.title === LEVEL2
      );
      if (!level2Node) {
        level2Node = {
          id:
            permission[APP_CODE]?.children[LEVEL2]?.serial_number?.toString() ||
            Math.floor(Number(Math.random() * 100000)).toString(),
          title: LEVEL2,
          type: "collapse",
          icon: "AbcIcon",
          children: [],
        };
        level1Node?.children!.push(level2Node);
      }

      // If LEVEL3 exists, find or create LEVEL3 node
      if (LEVEL3) {
        let level3Node = level2Node?.children!.find(
          (node) => node.title === LEVEL3
        );
        if (!level3Node) {
          level3Node = {
            id:
              permission[APP_CODE]?.children[
                LEVEL3
              ]?.serial_number?.toString() ||
              Math.floor(Number(Math.random() * 100000)).toString(),
            title: LEVEL3,
            url_path: URL_PATH || APP_CODE.toLowerCase(),
            type: "item",
            icon: "AbcIcon",
          };
          level2Node?.children!.push(level3Node);
        }
      }
    }

    if (LEVEL2 && level1Node && (LEVEL3 === "" || LEVEL3 === null)) {
      let level2Node = level1Node?.children!.find(
        (node) => node.title === LEVEL2
      );
      if (!level2Node) {
        level2Node = {
          id:
            permission[APP_CODE]?.children[LEVEL2]?.serial_number?.toString() ||
            Math.floor(Number(Math.random() * 100000)).toString(),
          title: LEVEL2,
          type: "item",
          icon: "AbcIcon",
          url_path: URL_PATH || APP_CODE.toLowerCase(),
        };
        level1Node?.children!.push(level2Node);
      }

      // If LEVEL3 exists, find or create LEVEL3 node
      if (LEVEL3) {
        let level3Node = level2Node?.children!.find(
          (node) => node.title === LEVEL3
        );
        if (!level3Node) {
          level3Node = {
            id:
              permission[APP_CODE]?.children[
                LEVEL3
              ]?.serial_number?.toString() ||
              Math.floor(Number(Math.random() * 100000)).toString(),
            title: LEVEL3,
            url_path: URL_PATH || APP_CODE.toLowerCase(),
            type: "item",
            icon: "AbcIcon",
          };
          level2Node?.children!.push(level3Node);
        }
      }
    }
  });

  console.log("Final tree structure:", Object.values(tree));
  return Object.values(tree);
};

export const getSearchFilterQuery = (
args: GetFilterQueryInterface, p0?: string[]): FindOptionsWhere<any> => {
  try {
    const { filter, outsideQuery } = args;

    // Start with existing outsideQuery or empty object
    const typeormWhere: FindOptionsWhere<any> = outsideQuery
      ? { ...outsideQuery }
      : {};

    if (!filter || !Array.isArray(filter)) {
      return typeormWhere;
    }

    filter.forEach((filterGroup, index) => {
      if (Array.isArray(filterGroup)) {
        filterGroup.forEach((condition) => {
          const { field_name, operator, field_value } = condition;

          // Skip if no value
          if (
            field_value === undefined ||
            field_value === null ||
            (Array.isArray(field_value) && field_value.length === 0) ||
            field_value === ""
          ) {
            return;
          }

          // Handle different operators for TypeORM
          switch (operator) {
            case "=":
              typeormWhere[field_name] = field_value;
              break;

            case "in":
              typeormWhere[field_name] = In(field_value);
              break;

            case "not in":
              typeormWhere[field_name] = Not(In(field_value));
              break;

            case "like":
              typeormWhere[field_name] = Like(`%${field_value}%`);
              break;

            case "starts with":
              typeormWhere[field_name] = Like(`${field_value}%`);
              break;

            case "ends with":
              typeormWhere[field_name] = Like(`%${field_value}`);
              break;

            case ">":
              typeormWhere[field_name] = MoreThan(field_value);
              break;

            case ">=":
              typeormWhere[field_name] = MoreThanOrEqual(field_value);
              break;

            case "<":
              typeormWhere[field_name] = LessThan(field_value);
              break;

            case "<=":
              typeormWhere[field_name] = LessThanOrEqual(field_value);
              break;

            case "between":
              if (Array.isArray(field_value) && field_value.length === 2) {
                typeormWhere[field_name] = Between(
                  field_value[0],
                  field_value[1]
                );
              }
              break;

            case "!=":
            case "<>":
              typeormWhere[field_name] = Not(field_value);
              break;

            case "is null":
              typeormWhere[field_name] = IsNull();
              break;

            case "is not null":
              typeormWhere[field_name] = Not(IsNull());
              break;

            case "contains":
              typeormWhere[field_name] = Like(`%${field_value}%`);
              break;

            default:
              // For unsupported operators, use equality as fallback
              console.warn(
                `Unsupported operator '${operator}', using '=' as fallback`
              );
              typeormWhere[field_name] = field_value;
              break;
          }
        });
      }
    });

    return typeormWhere;
  } catch (error) {
    console.error("Error building filter query:", error);
    return {};
  }
};
interface ITreeItem {
  id: string;
  label: string;
  parent_code?: string | null;
  level: number;
  children: ITreeItem[];
}

export function buildHierarchy(data: any[]): ITreeItem[] {
  const hierarchy: ITreeItem[] = [];

  data.forEach((eachData) => {
    const {
      ac_code,
      ac_name,
      l4_code,
      l4_description,
      l3_code,
      l3_description,
      l2_code,
      l2_description,
    } = eachData;

    if (!l2_code) {
      return;
    }

    let level2Index = hierarchy.findIndex((item) => item.id === l2_code);
    if (level2Index === -1) {
      hierarchy.push({
        id: l2_code,
        label: l2_description,
        level: 2,
        parent_code: null,
        children: [],
      });
      level2Index = hierarchy.length - 1;
    }

    const level2 = hierarchy[level2Index];

    if (!l3_code) {
      return;
    }

    let level3Index = level2?.children.findIndex((item) => item.id === l3_code);
    if (level3Index === -1) {
      level2?.children.push({
        id: l3_code,
        label: l3_description,
        level: 3,
        parent_code: l2_code,
        children: [],
      });
      level3Index = level2?.children.length - 1;
    }

    const level3 = level2?.children[level3Index];

    if (!l4_code) {
      return;
    }

    let level4Index = level3?.children.findIndex((item) => item.id === l4_code);
    if (level4Index === -1) {
      level3?.children.push({
        id: l4_code,
        label: l4_description,
        level: 4,
        parent_code: l3_code,
        children: [],
      });
      level4Index = level3?.children.length - 1;
    }

    const level4 = level3?.children[level4Index];

    if (!!ac_code) {
      let level5Index = level4?.children.findIndex(
        (item) => item.id === ac_code
      );
      if (level5Index === -1) {
        level4?.children.push({
          id: ac_code,
          label: ac_name,
          level: 5,
          parent_code: l4_code,
          children: [],
        });
      }
    }
  });

  return hierarchy;
}

// -----------GRN Report Format Functions ----------
export async function formatData(data: any, getTiPackdetSeriesData: any) {
  if (!data || !Array.isArray(data)) {
    return { success: false, error: "Invalid data format" };
  }

  // TypeORM entities are already plain objects, no need for .get()
  const plainData = data;

  const groupedData: Record<string, any[]> = {};
  const result: Record<string, any> = {};

  const commonFields = [
    "job_no",
    "user_id",
    "prin_name",
    "grn_number",
    "grn_date",
    "container_no",
    "container_size",
    "doc_ref",
    "po_no",
  ];

  commonFields.forEach((field) => {
    const lowerCaseField = field.toLowerCase();
    if (plainData[0][lowerCaseField] !== undefined) {
      result[field] = plainData[0][lowerCaseField];
    }
  });

  plainData.forEach((item) => {
    const prodCode = item.prod_code;
    if (!groupedData[prodCode]) {
      groupedData[prodCode] = [];
    }
    groupedData[prodCode].push(item);
  });

  const productGroups = await Promise.all(
    Object.values(groupedData).map(async (group: any) => {
      let totalGrossWt = 0;
      let totalNetWt = 0;
      let totalVolume = 0;

      const formattedGroup = await Promise.all(
        group.map(async (item: any) => {
          totalGrossWt += parseFloat(item.gross_wt || 0);
          totalNetWt += parseFloat(item.net_wt || 0);
          totalVolume += parseFloat(item.volume || 0);

          const formattedItem = { ...item };
          commonFields.forEach((field) => delete formattedItem[field]);

          try {
            // Use TypeORM Service instead of Sequelize model
            const childrenData = await getTiPackdetSeriesData({
              company_code: item.company_code,
              prin_code: item.prin_code,
              job_no: item.job_no,
              packdet_no: item.packdet_no,
            });

            if (Array.isArray(childrenData) && childrenData.length > 0) {
              formattedItem.children = childrenData;
            } else {
              formattedItem.children = [];
            }
          } catch (error) {
            console.error(
              `Error fetching children data for prod_code ${item.prod_code}:`,
              error
            );
          }

          return formattedItem;
        })
      );

      formattedGroup.push({
        prod_code: group[0].prod_code,
        gross_wt: totalGrossWt.toFixed(6),
        net_wt: totalNetWt.toFixed(6),
        volume: totalVolume.toFixed(6),
        isTotal: true,
      });

      return formattedGroup;
    })
  );

  let totalGrossWt = 0;
  let totalNetWt = 0;
  let totalVolume = 0;

  productGroups.flat().forEach((item: any) => {
    if (item.isTotal) return;
    totalGrossWt += parseFloat(item.gross_wt || 0);
    totalNetWt += parseFloat(item.net_wt || 0);
    totalVolume += parseFloat(item.volume || 0);
  });

  result.products = [
    ...productGroups.flat(),
    {
      gross_wt: totalGrossWt.toFixed(6),
      net_wt: totalNetWt.toFixed(6),
      volume: totalVolume.toFixed(6),
      grnTotal: true,
    },
  ];

  return result;
}

// Function to group data by container number
export const groupByContainerNo = (data: any[]) => {
  const groupedData: { [key: string]: any[] } = {};

  data.forEach((item) => {
    const containerNo = item.container_no;

    if (!groupedData[containerNo]) {
      groupedData[containerNo] = [];
    }

    groupedData[containerNo].push(item);
  });

  const result = Object.values(groupedData);
  return result;
};

// FIXED: Use TypeORM Service instead of Sequelize model
export const getTiPackdetSeriesData = async ({
  company_code,
  prin_code,
  job_no,
  packdet_no,
}: {
  company_code: string;
  prin_code: string;
  job_no: string;
  packdet_no: number;
}) => {
  try {
    // Use TypeORM Service instead of Sequelize model
    const packDetSeriesData = await TiPackdetSeriesService.findByPackdetNo(
      company_code,
      prin_code,
      job_no,
      packdet_no
    );

    if (packDetSeriesData.length > 0) {
      return packDetSeriesData;
    }
    return [];
  } catch (error: any) {
    console.log("Error Occurred in getTiPackdetSeriesData:", error.message);
    return error.message;
  }
};

// ---------- Stock Detail Report ------------
export const formatDataDetailStock = (data: any) => {
  if (!data || !Array.isArray(data))
    return { success: false, error: "Invalid data format" };

  // TypeORM entities are already plain objects
  const plainData = data;

  const groupedData: any = {};
  const result: any = {};
  const commonFields = ["company_code", "prin_code", "prin_name"];

  commonFields.forEach((field) => {
    const lowerCaseField = field.toLowerCase();
    if (plainData?.[0]?.[lowerCaseField] !== undefined)
      result[field] = plainData?.[0]?.[field];
  });

  plainData.forEach((item) => {
    const prodCode = item.prod_code;
    if (!groupedData[prodCode]) {
      groupedData[prodCode] = [];
    }
    groupedData[prodCode].push(item);
  });

  const productGroups = Object.values(groupedData).map((group: any) => {
    let totalPQtyInStock = 0;
    let totalLQtyInStock = 0;
    let totalPQtyAvailable = 0;
    let totalLQtyAvailable = 0;

    const firstItem = {
      prod_code: group[0].prod_code,
      prod_name: group[0].prod_name,
      p_uom: group[0].p_uom,
      l_uom: group[0].l_uom,
    };

    const formattedGroup = group.map((item: any) => {
      totalPQtyInStock += parseFloat(item.pqty_stock || 0);
      totalLQtyInStock += parseFloat(item.lqty_stock || 0);
      totalPQtyAvailable += parseFloat(item.pqty_avl || 0);
      totalLQtyAvailable += parseFloat(item.lqty_avl || 0);

      const formattedItem = { ...item };
      commonFields.forEach((field) => delete formattedItem[field]);
      delete formattedItem.prod_code;
      delete formattedItem.prod_name;
      delete formattedItem.puom;
      delete formattedItem.luom;

      return formattedItem;
    });

    formattedGroup.push({
      prod_code: group[0].prod_code,
      uppp: group[0].uppp,
      pqty_stock: totalPQtyInStock.toFixed(6),
      lqty_stock: totalLQtyInStock.toFixed(6),
      pqty_avl: totalPQtyAvailable.toFixed(6),
      lqty_avl: totalLQtyAvailable.toFixed(6),
      isTotal: true,
    });

    return [firstItem, ...formattedGroup];
  });

  let grandTotalPQtyInStock = 0;
  let grandTotalLQtyInStock = 0;
  let grandTotalPQtyAvailable = 0;
  let grandTotalLQtyAvailable = 0;

  productGroups.forEach((group: any) => {
    group.forEach((item: any) => {
      if (item.isTotal) return;
      grandTotalPQtyInStock += parseFloat(item.pqty_stock || 0);
      grandTotalLQtyInStock += parseFloat(item.lqty_stock || 0);
      grandTotalPQtyAvailable += parseFloat(item.pqty_avl || 0);
      grandTotalLQtyAvailable += parseFloat(item.lqty_avl || 0);
    });
  });

  result.products = [
    ...productGroups.flat(),
    {
      pqty_stock: grandTotalPQtyInStock.toFixed(6),
      lqty_stock: grandTotalLQtyInStock.toFixed(6),
      pqty_avl: grandTotalPQtyAvailable.toFixed(6),
      lqty_avl: grandTotalLQtyAvailable.toFixed(6),
      stockTotal: true,
    },
  ];

  return result;
};

// FIXED: Remove Sequelize-specific function or create alternative
export const convertSequelizeConditionToSql = (query: any): string => {
  console.warn("Sequelize-specific function - consider removing or replacing");
  return "1=1"; // Return default condition
};

// -------- convert data in to desired format for summary stock -----------
export const formatDataSummaryStock = (stockReport: any) => {
  return stockReport.map((item: any) => {
    const balance_puom =
      parseFloat(item.open_stk_puom) +
      (parseFloat(item.qty_in_puom) - parseFloat(item.qty_in_luom));
    const balance_luom =
      parseFloat(item.open_stk_luom) +
      (parseFloat(item.qty_in_luom) - parseFloat(item.qty_out_luom));
    const balance =
      parseFloat(item.open_stk) +
      (parseFloat(item.qty_in) - parseFloat(item.qty_out));

    return {
      ...item,
      balance_puom,
      balance_luom,
      balance,
    };
  });
};

// ---------- convert data in to desired format for Ageing Stock Report -----------
export const ageingStockFormatData = (data: any) => {
  if (!data || data.length === 0) return {};

  // TypeORM entities are already plain objects
  const plainData = data;

  const commonFields = {
    COMPANY_CODE: plainData[0].COMPANY_CODE,
    PRIN_CODE: plainData[0].PRIN_CODE,
    PRIN_NAME: plainData[0].PRIN_NAME,
    d_age1: plainData[0].d_age1,
    d_age2: plainData[0].d_age2,
    d_age3: plainData[0].d_age3,
    d_age4: plainData[0].d_age4,
    d_age5: plainData[0].d_age5,
  };

  let grandTotal = 0;
  let BELOW_AGE1_Total = 0;
  let AGE_1_total = 0;
  let AGE_2_total = 0;
  let AGE_3_total = 0;
  let AGE_4_total = 0;
  let ABOVE_AGE5_total = 0;

  const formattedData = plainData.map((item: any) => {
    const total =
      parseFloat(item.BELOW_AGE1) +
      parseFloat(item.AGE_1) +
      parseFloat(item.AGE_2) +
      parseFloat(item.AGE_3) +
      parseFloat(item.AGE_4) +
      parseFloat(item.ABOVE_AGE5);

    grandTotal += total;
    BELOW_AGE1_Total += parseFloat(item.BELOW_AGE1);
    AGE_1_total += parseFloat(item.AGE_1);
    AGE_2_total += parseFloat(item.AGE_2);
    AGE_3_total += parseFloat(item.AGE_3);
    AGE_4_total += parseFloat(item.AGE_4);
    ABOVE_AGE5_total += parseFloat(item.ABOVE_AGE5);

    return {
      BELOW_AGE1: item.BELOW_AGE1,
      AGE_1: item.AGE_1,
      AGE_2: item.AGE_2,
      AGE_3: item.AGE_3,
      AGE_4: item.AGE_4,
      ABOVE_AGE5: item.ABOVE_AGE5,
      total,
    };
  });

  formattedData.push({
    isAgeing: true,
    grand_total: grandTotal,
    BELOW_AGE1_Total,
    AGE_1_total,
    AGE_2_total,
    AGE_3_total,
    AGE_4_total,
    ABOVE_AGE5_total,
  });

  return {
    ...commonFields,
    data: formattedData,
  };
};

// ------- Ageing Report Accounts Division Formatted Functions -------
export const AgeingViewAccountsFormatted = (
  data: any[],
  age_1: any,
  age_2: any,
  age_3: any,
  age_4: any,
  age_5: any,
  age_6: any
) => {
  if (!data || data.length === 0) return {};

  // TypeORM entities are already plain objects
  const plainData = data;

  const commonFields = {
    d_age1: age_1,
    d_age2: age_2,
    d_age3: age_3,
    d_age4: age_4,
    d_age5: age_5,
    d_age6: age_6,
  };

  const groupedData = plainData.reduce((acc, item) => {
    const l4Code = item.l4_code;

    if (!acc[l4Code]) {
      acc[l4Code] = {
        data: [],
        totals: {
          isTotal: true,
          l4_code: item.l4_code,
          l4_description: item.l4_description,
          age_below: 0,
          age_1: 0,
          age_2: 0,
          age_3: 0,
          age_4: 0,
          age_5: 0,
          age_above: 0,
        },
        heading: {
          isHeading: true,
          l4_code: item.l4_code,
          l4_description: item.l4_description,
        },
      };
    }

    acc[l4Code].data.push(item);

    acc[l4Code].totals.age_below += parseFloat(item.age_below || 0);
    acc[l4Code].totals.age_1 += parseFloat(item.age_1 || 0);
    acc[l4Code].totals.age_2 += parseFloat(item.age_2 || 0);
    acc[l4Code].totals.age_3 += parseFloat(item.age_3 || 0);
    acc[l4Code].totals.age_4 += parseFloat(item.age_4 || 0);
    acc[l4Code].totals.age_5 += parseFloat(item.age_5 || 0);
    acc[l4Code].totals.age_above += parseFloat(item.age_above || 0);

    return acc;
  }, {});

  const grandTotals = {
    grandTotal: true,
    age_below: 0,
    age_1: 0,
    age_2: 0,
    age_3: 0,
    age_4: 0,
    age_5: 0,
    age_above: 0,
  };

  const resultDataArray = Object.values(groupedData).flatMap((group: any) => {
    grandTotals.age_below += group.totals.age_below;
    grandTotals.age_1 += group.totals.age_1;
    grandTotals.age_2 += group.totals.age_2;
    grandTotals.age_3 += group.totals.age_3;
    grandTotals.age_4 += group.totals.age_4;
    grandTotals.age_5 += group.totals.age_5;
    grandTotals.age_above += group.totals.age_above;

    return [group.heading, ...group.data, group.totals];
  });

  resultDataArray.push(grandTotals);

  return {
    ...commonFields,
    dataArray: resultDataArray,
  };
};

// --------- Structure Profit And Loss Report Data -----------
export const formatProfitAndLossReport = (data: any, decimalLimit: any) => {
  if (!data || !Array.isArray(data)) {
    return { success: false, error: "Invalid data format" };
  }

  // TypeORM entities are already plain objects
  const plainData = data;

  const groupedData: Record<string, any[]> = {};
  const result: Record<string, any> = {};

  plainData.forEach((item: any) => {
    const hCode = item.h_code;
    if (!groupedData[hCode]) {
      groupedData[hCode] = [];
    }
    groupedData[hCode].push(item);
  });

  const productGroups: any[] = [];
  let grandTotalLcurAmount = 0;

  for (const [hCode, group] of Object.entries(groupedData)) {
    let totalLcurAmount = 0;

    productGroups.push({
      h_code: hCode,
      h_name: group[0].h_name || "Unknown Name",
      isHeading: true,
    });

    const formattedGroup: any[] = group.map((item: any) => {
      const lcurAmount = parseFloat(item.lcur_amount || 0);
      totalLcurAmount += lcurAmount;
      return { ...item, lcur_amount: lcurAmount.toFixed(decimalLimit) };
    });

    formattedGroup.push({
      h_code: hCode,
      lcur_amount: totalLcurAmount.toFixed(decimalLimit),
      isTotal: true,
    });

    productGroups.push(...formattedGroup);
    grandTotalLcurAmount += totalLcurAmount;
  }

  productGroups.push({
    lcur_amount: grandTotalLcurAmount.toFixed(decimalLimit),
    plGrandTotal: true,
  });

  result.products = productGroups;
  console.log("result:", JSON.stringify(result));
  return result;
};

// ------------- Cheque Payment Report Format Function -------------
export const chequePaymentReportFormat = (
  data: any[],
  decimalLimit: number
) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { success: false, message: "Invalid data" };
  }

  // TypeORM entities are already plain objects
  const plainData = data;

  let total = 0;

  const commonFields = [
    "company_name",
    "hdr_ac_code",
    "doc_no",
    "doc_date",
    "cheque_no",
    "cheque_date",
    "party_name",
    "prepared",
    "verified",
    "approved",
    "bank_name_inv",
    "company_address1",
    "company_address2",
    "company_address3",
  ];

  const commonFieldData: Record<string, any> = {};
  commonFields.forEach((field) => {
    const lowerCaseField = field.toLowerCase();
    if (data[0][lowerCaseField] !== undefined) {
      commonFieldData[field] = plainData[0][lowerCaseField];
    }
  });

  const formattedData = plainData.map((item) => {
    const amount = parseFloat(item.amount) || 0;
    total += amount;
    return {
      ...item,
      amount: parseFloat(amount.toFixed(decimalLimit)),
    };
  });

  formattedData.push({
    isTotal: true,
    total: total.toFixed(decimalLimit),
  });

  return {
    ...commonFieldData,
    products: formattedData,
  };
};

//-------------create function for creating log-------------
// FIXED: Use TypeORM Service instead of Sequelize model
export const createLog = async (args: CreateLogInterface) => {
  const { event, request_user, module, description } = args;

  const createLogEntry = {
    company_code: request_user.company_code,
    module: module,
    description: description,
    read: "N",
    loginid: request_user.loginid,
  };

  switch (event) {
    case constants.EVENTS.COUNTRY_CREATED: {
      // Use TypeORM Service instead of Sequelize model
      await LogService.createLog({
        ...createLogEntry,
        created_by: request_user.loginid,
        updated_by: request_user.loginid,
      });
      break;
    }
  }
};

// Function to format role permissions
export function formatRolePermissions(rows: any[]) {
  const formattedData: { [key: string]: ButtonGroup } = {};

  rows.forEach((row) => {
    const roleId = row.SERIAL_NO || row.SERIAL_NO_OR_ROLE_ID;

    console.log("Formatting role permission:", {
      roleId,
      hasSERIAL_NO: row.SERIAL_NO,
      hasSERIAL_NO_OR_ROLE_ID: row.SERIAL_NO_OR_ROLE_ID,
      availableKeys: Object.keys(row),
    });

    if (roleId && !formattedData[roleId]) {
      formattedData[roleId] = {} as ButtonGroup;
    }

    if (roleId) {
      formattedData[roleId] = {
        new: row.SNEW || "N",
        modfiy: row.SMODIFY || "N",
        delete: row.SDELETE || "N",
        save: row.SSAVE || "N",
        save_as: row.SSAVEAS || "N",
        upload: row.SUPLOAD || "N",
        undo: row.SUNDO || "N",
        print: row.SPRINT || "N",
        print_setup: row.SPRINTSETUP || "N",
        help: row.SHELP || "N",
      };
    }
  });

  return formattedData;
}
// Email function 
export const notifyUser = async (args: SendEmailInterface) => {
  const {
    event,
    request_user,
    message,
    request_users,
    subject,
    cc,
    htmlMessage,
    attachments,
  } = args;

  const transporter = nodemailer.createTransport({
    service: "Outlook365",
    auth: {
      user: constants.ENV.EMAIL_USER,
      pass: constants.ENV.EMAIL_PASS,
    },
  });

  let mailOptions;

  switch (event) {
    case constants.EVENTS.COUNTRY_CREATED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_user?.contact_email,
        subject:
          subject || "Country " + constants.MESSAGES.CREATED_SUCCESSFULLY,
        text: message || "Country " + constants.MESSAGES.CREATED_SUCCESSFULLY,
      };
      break;

    case constants.EVENTS.TRANSACTION_COMPLETED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject: "Notification From BT-PMS",
        text: message || "A new transaction has been successfully completed.",
        html: htmlMessage,
      };
      break;
    case constants.EVENTS.PO_MODIFIED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject:
          subject || `Purchase Order Modified: ${request_user?.company_code}`,
        text:
          message ||
          `Dear Sir,\n\nYour Purchase Order has been modified.\n\nBest regards.`,
        attachments: attachments || [],
      };
      break;
    case constants.EVENTS.PO_CONFIRMED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject:
          subject || `Purchase Order Confirmed: ${request_user?.company_code}`,
        text:
          message ||
          `Dear Sir,\n\nYour Purchase Order has been confirmed.\n\nBest regards.`,
        attachments: attachments || [],
      };
      break;

    case constants.EVENTS.PO_CANCELLED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject:
          subject || `Purchase Order Cancelled: ${request_user?.company_code}`,
        text:
          message ||
          `Dear Sir,\n\nYour Purchase Order has been cancelled.\n\nBest regards.`,
        attachments: attachments || [],
      };
      break;

    // New cases for PR operations
    case "CANCEL":
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject: subject || `Purchase Request Cancelled`,
        text:
          message ||
          `Dear Sir,\n\nThe Purchase Request has been cancelled.\n\nBest regards.`,
        html: htmlMessage,
      };
      break;

    case "REJECT":
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject: subject || `Purchase Request Rejected`,
        text:
          message ||
          `Dear Sir,\n\nThe Purchase Request has been rejected.\n\nBest regards.`,
        html: htmlMessage,
      };
      break;

    case "SENTBACK":
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject: subject || `Purchase Request Sent Back`,
        text:
          message ||
          `Dear Sir,\n\nThe Purchase Request has been sent back for further action.\n\nBest regards.`,
        html: htmlMessage,
      };
      break;

    case constants.EVENTS.FORGOT_PASSWORD:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        subject: subject || "Password Reset Instructions",
        text:
          message || "Please follow the instructions to reset your password.",
        html: htmlMessage,
      };
      break;

    case constants.EVENTS.RESET_PASSWORD:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        subject: subject || "Password Reset Notification",
        text: message || "Your password has been reset successfully.",
        html: htmlMessage,
      };
      break;

    case "VENDOR_API_ERROR":
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject: subject || "Vendor API Error Notification",
        text: message || "An error occurred in the Vendor API integration.",
        html: htmlMessage,
        attachments: attachments || [],
      };
      break;

    // HR integration errors
    case "HR_API_ERROR":
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: cc,
        subject: subject || "HR API Error Notification",
        text: message || "An error occurred in the HR API integration.",
        html: htmlMessage,
        attachments: attachments || [],
      };
      break;

    case "APPROVAL_NOTIFICATION":
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: [
          "Sagar.b@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "gaurang.pai@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          ...(cc || []),
        ],
        subject: subject || "Approval Notification",
        text: message || "An approval is required for the vendor request.",
        html: htmlMessage,
        attachments: attachments || [],
      };
      break;
    case constants.EVENTS.LEAVE_APPROVAL_REQUEST:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users, 
        cc: [
          "Sagar.b@bayanattechnology.com",
          "gaurang.pai@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          ...(cc || []),
        ],
        subject: subject || `Leave Approval Required: ${request_user?.request_number || ""}`,
        text: message ||
        `Dear Sir/Madam,\n\nA leave request requires your action. Request No: ${request_user?.request_number || ""}.\nPlease login to LMS to take action.\n\nRegards.`,
        html: htmlMessage,
        attachments: attachments || [],
    };
    break;

    case constants.EVENTS.LEAVE_APPROVED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: [
          "Sagar.b@bayanattechnology.com",
          "gaurang.pai@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          "HR@almadinalogistics.com",
          ...(cc || []),
        ],
      subject: subject || `Leave Approved: ${request_user?.request_number || ""}`,
      text:
      message ||
      `Hello,\n\nYour leave request (${request_user?.request_number || ""}) has been approved.\n\nRegards.`,
      html: htmlMessage,
      attachments: attachments || [],
    };
    break;
    case constants.EVENTS.LEAVE_CANCEL:
    mailOptions = {
      from: constants.ENV.EMAIL_USER,
      to: request_users,
      cc: [
          "Sagar.b@bayanattechnology.com",
          "gaurang.pai@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          ...(cc || []),
        ],
      subject: subject || `Leave Rejected: ${request_user?.request_number || ""}`,
      text:
      message ||
      `Hello,\n\nYour leave request (${request_user?.request_number || ""}) has been rejected.${request_user?.reason ? ` Reason: ${request_user.reason}` : ""}\n\nRegards.`,
    html: htmlMessage,
    attachments: attachments || [],
    };
    break;

    case constants.EVENTS.LEAVE_SENTBACK:
    mailOptions = {
      from: constants.ENV.EMAIL_USER,
      to: request_users,
      cc: [
          "Sagar.b@bayanattechnology.com",
          "gaurang.pai@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          ...(cc || []),
        ],
      subject: subject || `Leave Sent Back: ${request_user?.request_number || ""}`,
      text:
      message ||
      `Hello,\n\nYour leave request (${request_user?.request_number || ""}) has been sent back for more information.\n\nRegards.`,
      html: htmlMessage,
      attachments: attachments || [],
      };
    break;

    case constants.EVENTS.LEAVE_INFO:
    mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: [
          "Sagar.b@bayanattechnology.com",
          "gaurang.pai@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          ...(cc || []),
        ],
        subject: subject || `Leave Notification: ${request_user?.request_number || ""}`,
        text: message || `Notification regarding leave request (${request_user?.request_number || ""}).`,
        html: htmlMessage,
      };
    break;

    case constants.EVENTS.LEAVE_REJECTED:
      mailOptions = {
        from: constants.ENV.EMAIL_USER,
        to: request_users,
        cc: [
          "gaurang.pai@bayanattechnology.com",
          "Sandeep.dandekar@bayanattechnology.com",
          "pratik.shirke@bayanattechnology.com",
          ...(cc || []),
        ],
        subject: subject || `Leave Rejected: ${request_user?.request_number || ""}`,
        text: message || `Hello,\n\nYour leave request (${request_user?.request_number || ""}) has been rejected.${request_user?.reason ? ` Reason: ${request_user.reason}` : ""}\n\nRegards.`,
        html: htmlMessage,
        attachments: attachments || [],
      };
      break;

    case constants.EVENTS.PROXY_ATTENDANCE_DETECTED:
    const proxyData = request_user; 
    const defaultProxyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background: #ff6b35; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .section { margin-bottom: 20px; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #ff6b35; }
        .employee-card { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 10px 0; }
        .proxy { border-left: 4px solid #ff4444; }
        .actual { border-left: 4px solid #4CAF50; }
        .footer { text-align: center; padding: 15px; background: #f1f1f1; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 PROXY ATTENDANCE DETECTED</h2>
          <p>Employee cancelled proxy attempt</p>
        </div>
        
        <div class="content">
          <div class="section">
            <p><strong>UUID:</strong> ${proxyData?.uuid || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${proxyData?.timestamp ? new Date(proxyData.timestamp).toLocaleString() : new Date().toLocaleString()}</p>
            <p><strong>Action:</strong> ${proxyData?.action_taken || 'cancelled_by_user'}</p>
            <p><strong>Confidence Level:</strong> ${proxyData?.confidence || 0}%</p>
          </div>

          <div class="section">
            <h3>👤 Proxy Employee (System Recognized)</h3>
            <div class="employee-card proxy">
              <p><strong>Employee Code:</strong> ${proxyData?.proxy_employee_code || 'N/A'}</p>
              <p><strong>Name:</strong> ${proxyData?.proxy_employee_name || 'N/A'}</p>
              <p><strong>Department:</strong> ${proxyData?.proxy_department || 'N/A'}</p>
            </div>
          </div>

          ${proxyData?.s3_image_url ? `
          <div class="section">
            <h3>🖼️ Captured Image</h3>
            <p><strong>S3 URL:</strong> <a href="${proxyData.s3_image_url}" target="_blank">View Image</a></p>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>This is an automated alert from the Face Recognition Attendance System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  mailOptions = {
    from: constants.ENV.EMAIL_USER,
    to: request_users, 
    cc: [
      //'prem@bayanattechnology.com'
    ],
    subject: subject || `🚨 PROXY ATTENDANCE DETECTED - ${proxyData?.timestamp ? new Date(proxyData.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}`,
    html: htmlMessage || defaultProxyHtml,
    attachments: attachments || [],
  };
  break;

    default:
      logger.warn(`Unhandled event type: ${event}`);
      return;
  }

  try {
    logger.info(`[NOTIFY] Sending email for event: ${event}, to: ${request_users || request_user?.contact_email}`);
    await transporter.sendMail(mailOptions);
    logger.info(`[NOTIFY] ✅ Email sent successfully for event: ${event}`);
  } catch (error) {
    logger.error(`[NOTIFY] ❌ Failed to send email for event: ${event}`, error);
  }
};
