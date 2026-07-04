import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { FacilityService } from "./facility.service.js";

export class FacilityController {
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const facilityId = req.user.facility_id;
      if (!facilityId) {
        return res.status(400).json({ message: "User is not associated with a facility" });
      }

      const profile = await FacilityService.getProfile(facilityId);
      return res.json(profile);
    } catch (error: any) {
      if (error.message === "FACILITY_NOT_FOUND") {
        return res.status(404).json({ message: "Facility not found" });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (req.user.role !== "FACILITY_ADMIN") {
        return res.status(403).json({ message: "Only Facility Admins can update the facility profile" });
      }

      const facilityId = req.user.facility_id;
      if (!facilityId) {
        return res.status(400).json({ message: "User is not associated with a facility" });
      }

      const { location, phone, latitude, longitude } = req.body;
      const profile = await FacilityService.updateProfile(facilityId, {
        location,
        phone,
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
      });
      return res.json(profile);
    } catch (error: any) {
      if (error.message === "FACILITY_NOT_FOUND") {
        return res.status(404).json({ message: "Facility not found" });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }


  static async getBalance(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const facilityId = req.user.facility_id;
      if (!facilityId) {
        return res.status(400).json({ message: "User is not associated with a facility" });
      }

      const balanceInfo = await FacilityService.getBalance(facilityId);
      return res.json(balanceInfo);
    } catch (error: any) {
      if (error.message === "FACILITY_NOT_FOUND") {
        return res.status(404).json({ message: "Facility not found." });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async initializeTopUp(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check role: Coordination Manager or Facility Admin
      const allowedRoles = ["SUPER_ADMIN", "FACILITY_ADMIN", "COORDINATION_MANAGER"];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const facilityId = req.user.facility_id;
      if (!facilityId && req.user.role !== "SUPER_ADMIN") {
        return res.status(400).json({ message: "Facility ID is required" });
      }

      const { amount, callback_url } = req.body;
      if (amount === undefined || callback_url === undefined) {
        return res.status(400).json({ message: "Amount and callback_url are required" });
      }

      const targetFacilityId = facilityId || req.body.facility_id;
      if (!targetFacilityId) {
        return res.status(400).json({ message: "facility_id is required for Super Admin requests." });
      }

      const topup = await FacilityService.initializeTopUp(
        targetFacilityId,
        req.user.email,
        Number(amount),
        callback_url
      );

      return res.json(topup);
    } catch (error: any) {
      if (error.message === "INVALID_AMOUNT") {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      if (error.message === "FACILITY_NOT_FOUND") {
        return res.status(404).json({ message: "Facility not found." });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async getBalanceHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Allowed roles: Facility Admin, Coordination Manager, Super Admin
      const allowedRoles = ["SUPER_ADMIN", "FACILITY_ADMIN", "COORDINATION_MANAGER"];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const isSuperAdmin = req.user.role === "SUPER_ADMIN";
      const facilityId = req.user.facility_id;

      const filters = {
        type: req.query.type?.toString(),
        start_date: req.query.start_date?.toString(),
        end_date: req.query.end_date?.toString(),
        page: req.query.page ? parseInt(req.query.page.toString()) : 1,
        limit: req.query.limit ? parseInt(req.query.limit.toString()) : 20,
      };

      const result = await FacilityService.getBalanceHistory(
        facilityId || "",
        isSuperAdmin,
        filters
      );

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}
