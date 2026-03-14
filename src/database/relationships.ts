import SecLoginModel from "../models/Security/seclogin_screenacess.model";
import MSPSProjectMasterModel from "../models/Security/projectmaster_security.model";
import MSProjectUserAssignModel from "../models/Security/projectuserassign_security.model";
import SecLogin from "../models/Security/seclogin_roleaccess.model";
import MsRole from "../models/Security/role_roleaccess.model";
import MsPsUserRoleMapping from "../models/Security/userrolemapping_roleaccess";
import accesssecmoduledata from "../models/Security/AccesstorollSecmodule_security.model";
import accesssecoperation from "../models/Security/Accesstorollsecoperation_security.model";
import MSCOMPANYUSERASSIGNEDModel from "../models/Security/DivisionUserassign_security.model";
import IMSHRDIVISIONMasterModel from "../models/Security/UsertoDivision_security.model";
import SecLoginModelUSERDIVISION from "../models/Security/seclogin_usertodivision.model";

SecLoginModel.belongsToMany(MSPSProjectMasterModel, {
  through: MSProjectUserAssignModel,
  foreignKey: "user_id",
  otherKey: "project_code",
  as: "assignedProjects",
});
MSPSProjectMasterModel.belongsToMany(SecLoginModel, {
  through: MSProjectUserAssignModel,
  foreignKey: "project_code",
  otherKey: "user_id",
  as: "assignedUsers",
});

//-----role access relationship  between users and  roles
SecLogin.belongsToMany(MsRole, {
  through: MsPsUserRoleMapping,
  foreignKey: "user_id",
  otherKey: "user_role",
  as: "assignedroles",
});
MsRole.belongsToMany(SecLogin, {
  through: MsPsUserRoleMapping,
  foreignKey: "user_role",
  otherKey: "user_id",
  as: "assignedUsers",
});

// Define relationship between SEC_MODULE_DATA and SEC_OPERATION_MASTER
accesssecmoduledata.hasMany(accesssecoperation, {
  foreignKey: "serial_no",
  sourceKey: "serial_no",
  as: "assignoperation",
});
accesssecoperation.belongsTo(accesssecmoduledata, {
  foreignKey: "serial_no",
  targetKey: "serial_no",
});

MSCOMPANYUSERASSIGNEDModel.belongsTo(IMSHRDIVISIONMasterModel, {
  foreignKey: "div_code",
  targetKey: "div_code",
});

IMSHRDIVISIONMasterModel.hasMany(MSCOMPANYUSERASSIGNEDModel, {
  foreignKey: "div_code",
  sourceKey: "div_code",
});

MSCOMPANYUSERASSIGNEDModel.belongsTo(SecLoginModelUSERDIVISION, {
  foreignKey: "user_id",
  targetKey: "user_id",
});

SecLoginModelUSERDIVISION.hasMany(MSCOMPANYUSERASSIGNEDModel, {
  foreignKey: "user_id",
  sourceKey: "user_id",
});

IMSHRDIVISIONMasterModel.belongsToMany(SecLoginModelUSERDIVISION, {
  through: MSCOMPANYUSERASSIGNEDModel,
  foreignKey: "div_code",
  otherKey: "user_id",
  as: "assignedUsers",
});

SecLoginModelUSERDIVISION.belongsToMany(IMSHRDIVISIONMasterModel, {
  through: MSCOMPANYUSERASSIGNEDModel,
  foreignKey: "user_id",
  otherKey: "div_code",
  as: "assigneddivisions",
});

export {
  SecLoginModel,
  MSPSProjectMasterModel,
  MSProjectUserAssignModel,
  SecLogin,
  MsRole,
  MsPsUserRoleMapping,
  accesssecmoduledata,
  accesssecoperation,
  MSCOMPANYUSERASSIGNEDModel,
  IMSHRDIVISIONMasterModel,
  SecLoginModelUSERDIVISION,
};
