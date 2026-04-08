import { Request, Response } from "express";
import constants from "../helpers/constants";
import {
  buildTree,
  formatRolePermissions,
  generateToken,
  notifyUser,
} from "../helpers/functions";
import { generateRefreshToken, verifyRefreshToken, ttlToMs } from "../helpers/functions";
import { loginSchema } from "../validation/auth.validation";
import { StructuredResult } from "../interfaces/auth.interface";
import { RequestWithUser } from "../interfaces/common.interface";
import { AuthService } from "../services/auth.service";
import { permissionsListQuery, userPermissionQuery } from "../utils/query";
import { VendorService } from "../services/vendor.service";

export const login = async (req: Request, res: Response) => {
  try {
    const { error } = loginSchema(req.body);
    if (error) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: error.message,
      });
      return;
    }

    const { email, password } = req.body;

    let user = await AuthService.findUserByEmailOrLoginId(email);

    if (!user) {
      try {
        const apiResponse = await VendorService.checkAccountEmployee(email);

        if (Array.isArray(apiResponse) && apiResponse.length > 0) {
          const apiUser = apiResponse[0];
          console.log("API User Data:", apiUser);

          const isExternalPassValid = password === apiUser.PASSWORD;

          if (!isExternalPassValid) {
            res.status(constants.STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: constants.MESSAGES.USER.INVALID_PASSWORD,
            });
            return;
          }

          const hashedPassword = await AuthService.hashPassword(password);
          user = await AuthService.createUserFromExternal(
            apiUser,
            password,
            hashedPassword
          );
        } else {
          res.status(constants.STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: "User not found in external system",
          });
          return;
        }
      } catch (apiError: any) {
        if (apiError.response?.status === 401) {
          res.status(constants.STATUS_CODES.UNAUTHORIZED).json({
            success: false,
            message:
              "Unauthorized access to external system. Please check API credentials.",
          });
        } else {
          res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Error validating user with external system",
            error: apiError.message,
          });
        }
        return;
      }
    }

    if (!user) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const isUserPassMatched = await AuthService.comparePassword(
      password,
      user.userpass
    );
    const isSecPassMatched = user.SEC_PASSWD
      ? await AuthService.comparePassword(password, user.SEC_PASSWD)
      : false;

    if (!isUserPassMatched && !isSecPassMatched) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: constants.MESSAGES.USER.INVALID_PASSWORD,
      });
      return;
    }

    const token = await generateToken({
      username: user.username,
      email_id: user.email_id,
      loginid: user.loginid,
    });
    // create refresh token and set as httpOnly cookie
    try {
      const refreshToken = await generateRefreshToken({
        username: user.username,
        email_id: user.email_id,
        loginid: user.loginid,
      });

      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      };
      const maxAge = ttlToMs((constants.AUTHENTICATION as any).REFRESH_TOKEN_TTL || process.env.REFRESH_TOKEN_TTL);
      if (maxAge) cookieOptions.maxAge = maxAge;
      res.cookie("refresh_token", refreshToken, cookieOptions);
    } catch (e: any) {
      console.warn("Failed to generate refresh token:", e?.message || e);
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: { token },
    });
    return;
  } catch (err: any) {
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred",
      error: err.message || err,
    });
    return;
  }
};

export const me = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const requestUser = req.user;

    if (!requestUser) {
      res.status(constants.STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: constants.MESSAGES.USER.USER_NOT_FOUND,
      });
      return;
    }

    const user = await AuthService.findUserByEmail(requestUser.email_id);
    if (!user) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: constants.MESSAGES.USER.USER_NOT_FOUND,
      });
      return;
    }

    // Remove sensitive data
    const { userpass, SEC_PASSWD, ...userWithoutPassword } = user;

    // Get all permissions
    let allPermissions: any[] = [];
    try {
      const permissionsResult = await AuthService.executeRawQuery(
        permissionsListQuery
      );
      allPermissions = permissionsResult[0] || [];
      console.log(`Retrieved ${allPermissions.length} permissions`);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      allPermissions = [];
    }

    const permissions: StructuredResult = (allPermissions || []).reduce(
      (acc: any, curr: any) => {
        const menu = curr.menu || curr.MENU;
        const serial_no =
          curr.serial_no || curr.SERIAL_NO || curr.serial_no_or_role_id;
        const app_code = curr.app_code || curr.APP_CODE;

        console.log("Processing permission:", { menu, serial_no, app_code });

        const serialNumber: number = Number(serial_no);

        if (serialNumber > 0 && app_code) {
          if (!acc[app_code]) {
            acc[app_code] = {
              serial_number: serialNumber,
              app_code: app_code,
              children: {},
            };
          }

          if (menu && menu !== app_code) {
            acc[app_code].children[menu] = {
              serial_number: serialNumber,
              app_code,
            };
          }
        }
        return acc;
      },
      {}
    );

    // Get user permissions
    let userPermissions: any[] = [];
    let formattedPermissions = {};

    try {
      console.log(`Fetching permissions for user: ${user.loginid}`);

      const userPermissionsResult = await AuthService.executeRawQuery(
        userPermissionQuery,
        { loginid: user.loginid }
      );
      userPermissions = userPermissionsResult[0] || [];
      console.log(`Retrieved ${userPermissions.length} user permissions`);

      // Debug the structure
      if (userPermissions.length > 0) {
        console.log("First permission structure:", userPermissions[0]);
        console.log("Available keys:", Object.keys(userPermissions[0]));
        console.log("SERIAL NO value:", userPermissions[0].SERIAL_NO);
      }

      if (userPermissions.length > 0) {
        formattedPermissions = formatRolePermissions(userPermissions);
        console.log(
          `Formatted permissions keys:`,
          Object.keys(formattedPermissions)
        );
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
    }

    // Build menu tree
    let permissionBasedMenuTree = {};
    if (formattedPermissions && Object.keys(formattedPermissions).length > 0) {
      const validKeys = Object.keys(formattedPermissions).filter((key) => {
        const num = Number(key);
        return !isNaN(num) && num > 0;
      });

      console.log(`Valid serial numbers for menu tree:`, validKeys);

      if (validKeys.length > 0) {
        try {
          const serialNumbersNumeric = validKeys.map((sn) => Number(sn));

          const placeholders = serialNumbersNumeric
            .map((_, idx) => `:param${idx}`)
            .join(",");
          const bindParams: any = {};
          serialNumbersNumeric.forEach((sn, idx) => {
            bindParams[`param${idx}`] = sn;
          });

          const menuTreeQuery = `
            SELECT * FROM SEC_MODULE_DATA 
            WHERE SERIAL_NO IN (${placeholders})
            ORDER BY SERIAL_NO
          `;

          console.log(
            "Executing menu tree query with serial numbers:",
            serialNumbersNumeric
          );

          const [menuTreeData] = await AuthService.executeRawQuery(
            menuTreeQuery,
            bindParams
          );

          if (menuTreeData && menuTreeData.length > 0) {
            permissionBasedMenuTree = buildTree(menuTreeData, permissions);
            console.log(
              `Successfully built menu tree with ${menuTreeData.length} items`
            );
          }
        } catch (error) {
          console.error("Error fetching menu tree:", error);
        }
      }
    }

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      data: {
        user: userWithoutPassword,
        permissionBasedMenuTree,
        permissions,
        user_permission: formattedPermissions,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/auth/me:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        error.message || "An error occurred while processing your request",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Check if user exists
    const user = await AuthService.findUserByEmailOrLoginId(email);

    if (!user) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Send password reset email
    await notifyUser({
      event: constants.EVENTS.FORGOT_PASSWORD,
      request_users: user.email_id,
      subject: "Password Reset Instructions",
      htmlMessage: `
        <p>Dear User,</p>
        <p>Please click on the following link to reset your password:</p>
        <p><a href="${process.env.FRONTEND_URL}/reset-password?email=${user.email_id}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,</p>
        <p>Bayanat Technology</p>
      `,
    });

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Password reset instructions have been sent to your email",
    });
    return;
  } catch (error: any) {
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "An error occurred",
    });
    return;
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Find user by email
    const user = await AuthService.findUserByEmailOrLoginId(email);

    if (!user) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await AuthService.hashPassword(password);

    // Update user's password
    await AuthService.updateUserPassword(email, hashedPassword);

    // Send confirmation email
    await notifyUser({
      event: constants.EVENTS.RESET_PASSWORD,
      request_users: user.email_id,
      subject: "Password Reset Successful",
      htmlMessage: `
        <p>Dear User,</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <p>Best regards,</p>
        <p>Bayanat Technology</p>
      `,
    });

    res.status(constants.STATUS_CODES.OK).json({
      success: true,
      message: "Password has been reset successfully",
    });
    return;
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "An error occurred",
    });
    return;
  }
};

// Parse cookie header into object
const parseCookies = (cookieHeader?: string) => {
  const list: any = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach(function (cookie) {
    const parts = cookie.split("=");
    const key = parts.shift()?.trim();
    if (!key) return;
    const value = parts.join("=");
    list[key] = decodeURIComponent(value);
  });
  return list;
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req.headers?.cookie as string);
    const refreshToken = cookies["refresh_token"];
    if (!refreshToken) {
      res.status(constants.STATUS_CODES.UNAUTHORIZED).json({ success: false, message: "Refresh token missing" });
      return;
    }

    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err: any) {
      res.status(constants.STATUS_CODES.UNAUTHORIZED).json({ success: false, message: "Invalid or expired refresh token" });
      return;
    }

    const newAccessToken = await generateToken({ username: payload.username, email_id: payload.email_id, loginid: payload.loginid });

    // rotate refresh token (optional): issue a fresh one
    try {
      const newRefresh = await generateRefreshToken({ username: payload.username, email_id: payload.email_id, loginid: payload.loginid });
      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      };
      const maxAge = ttlToMs((constants.AUTHENTICATION as any).REFRESH_TOKEN_TTL || process.env.REFRESH_TOKEN_TTL);
      if (maxAge) cookieOptions.maxAge = maxAge;
      res.cookie("refresh_token", newRefresh, cookieOptions);
    } catch (e: any) {
      console.warn("Failed to rotate refresh token:", e?.message || e);
    }

    res.status(constants.STATUS_CODES.OK).json({ success: true, data: { token: newAccessToken } });
    return;
  } catch (err: any) {
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || err });
    return;
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // clear cookie
    res.clearCookie("refresh_token", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/" });
    res.status(constants.STATUS_CODES.OK).json({ success: true, message: "Logged out" });
    return;
  } catch (err: any) {
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || err });
    return;
  }
};
export const resetPasswordWithLoginId = async (req: Request, res: Response) => {
  try {
    const { loginId, newPassword } = req.body;

    if (!loginId || !newPassword) {
      res.status(constants.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Login ID and new password are required",
      });
      return;
    }

    // Find user by login ID
    const user = await AuthService.findUserByEmailOrLoginId(loginId);

    if (!user) {
      res.status(constants.STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "User not found with the provided login ID",
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await AuthService.hashPassword(newPassword);

    // Update user's password using email
    await AuthService.updateUserPassword(user.email_id, hashedPassword);

    // Check if company_code contains JASRA (case-insensitive)
    const isJasraCompany = user.company_code && 
                           user.company_code.toUpperCase().includes("JASRA");
    
    if (isJasraCompany) {
      // For JASRA users: Send password reset link via email
      await notifyUser({
        event: constants.EVENTS.RESET_PASSWORD,
        request_users: user.email_id,
        subject: "Password Reset Link",
        htmlMessage: `
          <p>Dear ${user.username || 'User'},</p>
          <p>Please click on the following link to reset your password:</p>
          <p><a href="${process.env.FRONTEND_URL}/reset-password?email=${user.email_id}">Reset Password</a></p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,</p>
          <p>Bayanat Technology</p>
        `,
      });

      res.status(constants.STATUS_CODES.OK).json({
        success: true,
        message: "Password reset link has been sent to your email",
        emailSent: true,
      });
      return;
    } else {
      // For non-JASRA users: Reset password directly
      // Send confirmation email
      await notifyUser({
        event: constants.EVENTS.RESET_PASSWORD,
        request_users: user.email_id,
        subject: "Password Reset Successful",
        htmlMessage: `
          <p>Dear ${user.username || 'User'},</p>
          <p>Your password has been successfully reset for login ID: ${loginId}</p>
          <p>If you did not make this change, please contact support immediately.</p>
          <p>Best regards,</p>
          <p>Bayanat Technology</p>
        `,
      });

      res.status(constants.STATUS_CODES.OK).json({
        success: true,
        message: "Password has been reset successfully",
        emailSent: false,
      });
      return;
    }
  } catch (error: any) {
    console.error("Reset Password With Login ID Error:", error);
    res.status(constants.STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "An error occurred while resetting password",
    });
    return;
  }
};
