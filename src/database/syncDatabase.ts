import { sequelize } from "./connection"; // Database connection
import {
  SecLoginModel,
  MSPSProjectMasterModel,
  MSProjectUserAssignModel,
} from "./relationships"; // Relationships file

// Sync all models (with relationships)
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("Database synchronized with models and relationships!");
  } catch (error) {
    console.error("Error syncing database:", error);
  }
})();
