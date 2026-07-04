import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { InventoryService } from "./inventory.service.js";

export class InventoryController {
  static async getFacilityInventory(
    req: AuthRequest,
    res: Response
  ) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({
          message: "Facility required",
        });
      }

      const inventory =
        await InventoryService.getFacilityInventory(
          req.user.facility_id
        );

      return res.json({
        inventory,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateBlood(
    req: AuthRequest,
    res: Response
  ) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item =
        await InventoryService.addBloodInventory(
          req.user.facility_id,
          req.user.user_id,
          req.body
        );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateDrugs(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item = await InventoryService.addDrugInventory(
        req.user.facility_id,
        req.user.user_id,
        req.body
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateIcuBeds(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item = await InventoryService.updateIcuBeds(
        req.user.facility_id,
        req.user.user_id,
        req.body
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateVentilators(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item = await InventoryService.updateVentilators(
        req.user.facility_id,
        req.user.user_id,
        req.body
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateOxygenCylinders(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item = await InventoryService.updateOxygen(
        req.user.facility_id,
        req.user.user_id,
        req.body
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateTheatres(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item = await InventoryService.updateTheatres(
        req.user.facility_id,
        req.user.user_id,
        req.body
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async updateSupplies(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.facility_id) {
        return res.status(403).json({ message: "Facility required" });
      }
      const item = await InventoryService.addSupply(
        req.user.facility_id,
        req.user.user_id,
        req.body
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  }

  static async getNetworkResources(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const resources =
        await InventoryService.getNetworkResources();

      return res.json({
        resources,
      });
    } catch {
      return res.status(500).json({
        message: "Server error",
      });
    }
  }
  
  static async getResourceFacilities(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const resourceType =
        req.query.resourceType?.toString();

      const bloodGroup =
        req.query.bloodGroup?.toString();

      const name =
        req.query.name?.toString();

      if (!resourceType) {
        return res.status(400).json({
          message: "resourceType is required",
        });
      }

      const facilities =
        await InventoryService.getResourceFacilities(
          resourceType,
          bloodGroup,
          name
        );

      return res.status(200).json({
        facilities,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
}


