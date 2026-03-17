import * as express from "express";
import passport from "passport";
import {
  getLogs,
  getUnReadLogsCount,
  updateReadLog,
} from "../controllers/log.controller";
import { checkUserAuthorization } from "../middleware/checkUserAthorization";

const router = express.Router();

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  checkUserAuthorization,
  getLogs
);

router.get(
  "/read",
  passport.authenticate("jwt", { session: false }),
  checkUserAuthorization,
  getUnReadLogsCount
);

router.put(
  "/allRead",
  passport.authenticate("jwt", { session: false }),
  checkUserAuthorization,
  updateReadLog
);

export default router;
