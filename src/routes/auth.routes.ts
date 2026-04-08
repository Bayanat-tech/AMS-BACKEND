import * as express from "express";
import passport from "passport";
import {
  login,
  me,
  resetPassword,
  forgotPassword,
    resetPasswordWithLoginId,
  refresh,
  logout,
} from "../controllers/auth.controller";

// Create a new Express router
const router = express.Router();

// Define the login route
// This route accepts a POST request with the username and password
// in the request body.
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);
router.post("/reset-password-loginid", resetPasswordWithLoginId);

// Define the me route
// This route accepts a GET request and requires a valid JWT token
// to be passed in the Authorization header.
router.get("/me", passport.authenticate("jwt", { session: false }), me);

// Export the router
export default router;
