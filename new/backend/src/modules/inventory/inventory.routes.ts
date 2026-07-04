import { Router } from "express";

import { authMiddleware }
  from "../../middleware/auth.middleware.js";

import { requireRole }
  from "../../middleware/role.middleware.js";

import { InventoryController }
  from "./inventory.controller.js";

import { validate } from "../../middleware/validate.js";

import {
  bloodSchema,
  drugSchema,
  icuSchema,
  ventilatorSchema,
  oxygenSchema,
  theatreSchema,
  supplySchema,
} from "./inventory.validation.js";
import { requireResourceAccess } from "../../middleware/resource.acces.js";


const router = Router();

router.get(
  "/facility/inventory",
  authMiddleware,
  requireRole([
    "FACILITY_ADMIN",
    "INVENTORY_MANAGER",
    "SUPER_ADMIN",
  ]),
  InventoryController.getFacilityInventory
);

router.put(
  "/facility/inventory/blood",
  authMiddleware,
  requireRole([
    "FACILITY_ADMIN",
    "INVENTORY_MANAGER",
  ]),
  validate(bloodSchema),
  requireResourceAccess("BLOOD"),
  InventoryController.updateBlood
);

router.put(
  "/facility/inventory/drugs",
  authMiddleware,
  requireRole(["FACILITY_ADMIN", "INVENTORY_MANAGER"]),
  validate(drugSchema),
  requireResourceAccess("DRUG"),
  InventoryController.updateDrugs
);

router.put(
  "/facility/inventory/icu-beds",
  authMiddleware,
  requireRole(["FACILITY_ADMIN", "INVENTORY_MANAGER"]),
  validate(icuSchema),
  requireResourceAccess("ICU_BED"),
  InventoryController.updateIcuBeds
);

router.put(
  "/facility/inventory/ventilators",
  authMiddleware,
  requireRole(["FACILITY_ADMIN", "INVENTORY_MANAGER"]),
  validate(ventilatorSchema),
  requireResourceAccess("VENTILATOR"),
  InventoryController.updateVentilators
);

router.put(
  "/facility/inventory/oxygen-cylinders",
  authMiddleware,
  requireRole(["FACILITY_ADMIN", "INVENTORY_MANAGER"]),
  validate(oxygenSchema),
  requireResourceAccess("OXYGEN_CYLINDER"),
  InventoryController.updateOxygenCylinders
);

router.put(
  "/facility/inventory/theatres",
  authMiddleware,
  requireRole(["FACILITY_ADMIN", "INVENTORY_MANAGER"]),
  validate(theatreSchema),
  requireResourceAccess("OPERATING_THEATRE"),
  InventoryController.updateTheatres
);

router.put(
  "/facility/inventory/supplies",
  authMiddleware,
  requireRole(["FACILITY_ADMIN", "INVENTORY_MANAGER"]),
  validate(supplySchema),
  requireResourceAccess("OTHER_SUPPLY"),
  InventoryController.updateSupplies
);

router.get(
  "/network/inventory/resources",
  authMiddleware,
  InventoryController.getNetworkResources
);

router.get(
  "/network/inventory/facilities",
  authMiddleware,
  InventoryController.getResourceFacilities
);

export default router;