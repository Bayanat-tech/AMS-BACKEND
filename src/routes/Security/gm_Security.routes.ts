import * as express from "express";

// import {
//   createrolemaster,
//   updaterolemaster,
// } from "../../controllers/Security/rolemaster_security.controller";

// import {
//   createflowmaster,
//   updateflowmaster,
// } from "../../controllers/Security/flowmaster_security.controller";

import { SecmasterController } from "../../controllers/Security/secmaster_security.controller";

import {
  createsecmodulemaster,
  updatesecmodulemaster,
} from "../../controllers/Security/secmodule_security.controller";

import {
  createcompanymaster,
  updatecompanymaster,
} from "../../controllers/Security/company_security.controller";

//-------screnaccess--------------------------------------
import {
  createscreenacess,
  deleteScreenaccess,
  getUserAssignedProjects,
} from "../../controllers/Security/screenacess_security.controller";
//--------Userroleaccess--------------------------------------
import {
  createrollaccess,
  deleterollaccess,
  getUserAssignedRoll,
} from "../../controllers/Security/userrollaccess_security.controller";
import {
  createSecRollAppAccess,
  deleteSecRollAppAccess,
  getOperationalMaster,
  getSecRollAppAccess,
  updateSecRollAppAccess,
} from "../../controllers/Security/accessroll_security.controller";
import {
  createSecRollFunctionAccessUser,
  deleteSecRollFunctionAccessUser,
  getSecRollFunctionAccessUser,
  updateSecRoleFunctionAccessUser,
} from "../../controllers/Security/accessuser_security.controller";

import {
  createusertodivisionaccess,
  deletedivisonaccess,
  getUserAssigneddivision,
} from "../../controllers/Security/usertodivisionaccess_security.controller";

import {
  createreportmaster,
  modifyreportmaster,
  getReportMaster,
} from "../../controllers/Security/reportmaster_security.controller";

import {
  createquerymaster,
  updatequerymaster,
} from "../../controllers/Security/querymaster.controller";
//-------------Accessrolesecroleapp----------------------

const router = express.Router();

// router.post("/rolemaster", createrolemaster);
// router.put("/rolemaster", updaterolemaster);

// router.post("/flowmaster", createflowmaster);
// router.put("/flowmaster", updateflowmaster);

router.post("/secmaster", SecmasterController.createsecmaster);
router.put("/secmaster", SecmasterController.updatesecmaster);

router.post("/secmoduledata", createsecmodulemaster);
router.put("/secmoduledata", updatesecmodulemaster);

router.post("/seccompany", createcompanymaster);
router.put("/seccompany", updatecompanymaster);

//screenaccess

router.post("/projectaccess", createscreenacess);
router.get("/projectaccess/:user_id", getUserAssignedProjects);
router.post("/projectaccess/delete", deleteScreenaccess);

//userroleaccess
router.post("/userroleaccess", createrollaccess);
router.get("/userroleaccess/:user_id", getUserAssignedRoll);
router.post("/userroleaccess/delete", deleterollaccess);

//Accessrolesecroleapp
router.get("/accessassignrole", getSecRollAppAccess);
router.post("/accessassignrole", createSecRollAppAccess);
router.get("/accessassignrole/:serial_no", getOperationalMaster);
router.post("/accessassignrole/delete", deleteSecRollAppAccess);
router.put("/accessassignrole", updateSecRollAppAccess);

//AccessUserto
router.get("/accessassignuser", getSecRollFunctionAccessUser);
router.post("/accessassignuser", createSecRollFunctionAccessUser);
router.get("/accessassignuser/:serial_no", getOperationalMaster);
router.post("/accessassignuser/delete", deleteSecRollFunctionAccessUser);
router.put("/accessassignuser", updateSecRoleFunctionAccessUser);

//Accessusertodivision
router.post("/userdivisionaccess", createusertodivisionaccess);
router.get("/userdivisionaccess/:user_id", getUserAssigneddivision);
router.post("/userdivisionaccess/delete", deletedivisonaccess);

// MG report
router.get("/reportmaster/:report_no", getReportMaster);
router.post("/reportmaster/create", createreportmaster);
router.patch("/reportmaster/modify", modifyreportmaster);

//DYNAMIC QUERY
router.post("/query_master", createquerymaster);
router.put("/query_master", updatequerymaster);

export default router;
