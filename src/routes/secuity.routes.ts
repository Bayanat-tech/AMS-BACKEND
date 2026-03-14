import * as express from "express";
import passport from "passport";
import { getSecMaster } from "../controllers/Security/security.controller";
import gmSecRouter from "./Security/gm_Security.routes";
import { checkUserAuthorization } from "../middleware/checkUserAthorization";
import { deleteSecMaster } from "../controllers/Security/security.controller";
const router = express.Router();
console.log("Router declaration for Security");
router.get(
  "/:master",
  passport.authenticate("jwt", { session: false }),
  checkUserAuthorization,
  getSecMaster
);

router.use(
  "/gm",
  passport.authenticate("jwt", { session: false }),
  checkUserAuthorization,
  gmSecRouter
);

router.post(
  "/:master",
  passport.authenticate("jwt", { session: false }),
  deleteSecMaster
);
export default router;
