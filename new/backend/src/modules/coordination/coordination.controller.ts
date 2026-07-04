import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { CoordinationService } from "./coordination.service.js";
import {
  createRequestSchema,
  fulfillRequestSchema,
  acknowledgeRequestSchema,
} from "./coordination.validation.js";

const ALLOWED_ROLES = ["SUPER_ADMIN", "FACILITY_ADMIN", "COORDINATION_MANAGER"] as const;

function getUserId(req: AuthRequest): string {
  return req.user?.user_id || req.user?.id || "system";
}

function getFacilityId(req: AuthRequest): string {
  return req.user?.facility_id || "";
}

function isSuperAdmin(req: AuthRequest): boolean {
  return req.user?.role === "SUPER_ADMIN";
}

export class CoordinationController {
  // -------------------------------------------------------------------------
  // POST /coordination/requests
  // -------------------------------------------------------------------------
  static async createRequest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (!ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = createRequestSchema.parse(req.body);
      const facilityId = getFacilityId(req);

      if (!facilityId && !isSuperAdmin(req)) {
        return res.status(400).json({ message: "Facility required for this action." });
      }

      const targetFacilityId = facilityId || req.body.facility_id;
      if (!targetFacilityId) {
        return res.status(400).json({ message: "facility_id is required for Super Admin requests." });
      }

      const result = await CoordinationService.createRequest(
        getUserId(req),
        targetFacilityId,
        validatedData
      );

      return res.status(201).json({
        id: result.request.id,
        facility_id: result.request.facilityId,
        resource_type_id: result.request.resourceTypeId,
        resource_name: result.request.resourceType.name,
        quantity: result.request.quantity,
        classification: result.request.classification,
        urgency_level: result.request.urgencyLevel,
        broadcast_radius_km: result.request.broadcastRadiusKm,
        timeframe_hours: result.request.timeframeHours,
        additional_notes: result.request.additionalNotes,
        status: result.request.status,
        payment_status: result.request.paymentStatus,
        total_amount: Number(result.request.totalAmount),
        balance_after: Number(result.balance_after),
        expires_at: result.request.expiresAt,
        created_at: result.request.createdAt,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      const errorMap: Record<string, [number, string]> = {
        RESOURCE_TYPE_NOT_FOUND: [404, "Resource type not found."],
        FACILITY_NOT_FOUND: [404, "Facility not found."],
        RESOURCE_NOT_ALLOWED: [400, "This facility type cannot track this resource."],
        INSUFFICIENT_BALANCE: [400, "Insufficient balance. Please top up."],
      };
      if (errorMap[error.message]) {
        const [status, message] = errorMap[error.message];
        return res.status(status).json({ message });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------------
  // GET /coordination/requests
  // -------------------------------------------------------------------------
  static async getRequests(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const result = await CoordinationService.getRequests(
        getFacilityId(req),
        isSuperAdmin(req),
        {
          status: req.query.status?.toString(),
          urgency_level: req.query.urgency_level?.toString(),
          resource_type_id: req.query.resource_type_id?.toString(),
          classification: req.query.classification?.toString(),
          page: req.query.page ? parseInt(req.query.page.toString()) : 1,
          limit: req.query.limit ? parseInt(req.query.limit.toString()) : 20,
        }
      );

      return res.json({
        requests: result.requests.map((r) => ({
          id: r.id,
          resource_type_id: r.resourceTypeId,
          resource_name: r.resourceType.name,
          quantity: r.quantity,
          classification: r.classification,
          urgency_level: r.urgencyLevel,
          broadcast_radius_km: r.broadcastRadiusKm,
          status: r.status,
          payment_status: r.paymentStatus,
          total_amount: Number(r.totalAmount),
          expires_at: r.expiresAt,
          created_at: r.createdAt,
        })),
        pagination: result.pagination,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------------
  // GET /coordination/requests/nearby
  // -------------------------------------------------------------------------
  static async getNearbyRequests(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (!ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const facilityId = getFacilityId(req);
      if (!facilityId) {
        return res.status(400).json({ message: "Facility required for nearby search." });
      }

      const radiusRaw = req.query.radius_km;
      if (!radiusRaw) {
        return res.status(400).json({ message: "radius_km is required." });
      }

      const radiusKm = parseInt(radiusRaw.toString(), 10);
      if (isNaN(radiusKm) || radiusKm <= 0) {
        return res.status(400).json({ message: "radius_km must be a positive integer." });
      }

      const statusFilter = req.query.status?.toString();

      const requests = await CoordinationService.getNearbyRequests(
        facilityId,
        radiusKm,
        statusFilter
      );

      return res.json({ requests });
    } catch (error: any) {
      const errorMap: Record<string, [number, string]> = {
        FACILITY_NOT_FOUND: [404, "Facility not found."],
        FACILITY_LOCATION_NOT_SET: [
          400,
          "Your facility does not have a location set. Please update your facility with latitude and longitude.",
        ],
      };
      if (errorMap[error.message]) {
        const [status, message] = errorMap[error.message];
        return res.status(status).json({ message });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------------
  // GET /coordination/requests/:id
  // -------------------------------------------------------------------------
  static async getRequestById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ message: "Missing ID" });

      const request = await CoordinationService.getRequestById(
        id,
        getFacilityId(req),
        isSuperAdmin(req)
      );

      return res.json({
        id: request.id,
        facility_id: request.facilityId,
        facility_name: request.facility.name,
        resource_type_id: request.resourceTypeId,
        resource_name: request.resourceType.name,
        category: request.resourceType.type,
        quantity: request.quantity,
        classification: request.classification,
        urgency_level: request.urgencyLevel,
        broadcast_radius_km: request.broadcastRadiusKm,
        timeframe_hours: request.timeframeHours,
        additional_notes: request.additionalNotes,
        status: request.status,
        acknowledged_by: request.acknowledgedBy,
        acknowledged_by_name: request.acknowledgingFacility?.name ?? null,
        acknowledged_at: request.acknowledgedAt,
        fulfilled_by: request.fulfilledBy,
        fulfilled_by_name: request.fulfillmentFacility?.name ?? null,
        fulfilled_at: request.fulfilledAt,
        price_per_unit: request.pricePerUnit ? Number(request.pricePerUnit) : null,
        total_amount: request.totalAmount ? Number(request.totalAmount) : null,
        payment_status: request.paymentStatus,
        expires_at: request.expiresAt,
        created_by: { id: request.creator.id, email: request.creator.email },
        created_at: request.createdAt,
        updated_at: request.updatedAt,
      });
    } catch (error: any) {
      if (error.message === "REQUEST_NOT_FOUND") {
        return res.status(404).json({ message: "Request not found." });
      }
      if (error.message === "FORBIDDEN") {
        return res.status(403).json({ message: "You do not have permission to view this request." });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------------
  // PUT /coordination/requests/:id/acknowledge
  // -------------------------------------------------------------------------
  static async acknowledgeRequest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (!ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ message: "Missing ID" });

      const facilityId = getFacilityId(req);
      if (!facilityId && !isSuperAdmin(req)) {
        return res.status(400).json({ message: "Facility required for this action." });
      }

      const validatedBody = acknowledgeRequestSchema.parse(req.body);

      const updated = await CoordinationService.acknowledgeRequest(
        id,
        facilityId,
        isSuperAdmin(req),
        validatedBody
      );

      return res.json({
        id: updated.id,
        status: updated.status,
        acknowledged_by: updated.acknowledgedBy,
        acknowledged_by_name: updated.acknowledgingFacility?.name ?? null,
        acknowledged_at: updated.acknowledgedAt,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      const errorMap: Record<string, [number, string]> = {
        REQUEST_NOT_FOUND: [404, "Request not found."],
        NOT_EMERGENCY_REQUEST: [400, "Only emergency requests can be acknowledged."],
        INVALID_STATUS_TRANSITION: [400, "Request cannot be acknowledged in its current status."],
        REQUEST_EXPIRED: [400, "This emergency request has expired."],
        CANNOT_ACKNOWLEDGE_OWN_REQUEST: [403, "You cannot acknowledge your own facility's request."],
      };
      if (errorMap[error.message]) {
        const [status, message] = errorMap[error.message];
        return res.status(status).json({ message });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------------
  // PUT /coordination/requests/:id/fulfill
  // -------------------------------------------------------------------------
  static async fulfillRequest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (!ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ message: "Missing ID" });

      const validatedBody = fulfillRequestSchema.parse(req.body);

      const result = await CoordinationService.fulfillRequest(
        id,
        getFacilityId(req),
        isSuperAdmin(req),
        getUserId(req),
        validatedBody
      );

      return res.json({
        id: result.request.id,
        status: result.request.status,
        fulfilled_by: result.request.fulfilledBy,
        fulfilled_at: result.request.fulfilledAt,
        price_per_unit: result.request.pricePerUnit
          ? Number(result.request.pricePerUnit)
          : null,
        total_amount: result.request.totalAmount
          ? Number(result.request.totalAmount)
          : null,
        ...(result.balance_after !== null && {
          balance_after: Number(result.balance_after),
        }),
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      const errorMap: Record<string, [number, string]> = {
        REQUEST_NOT_FOUND: [404, "Request not found."],
        FORBIDDEN: [403, "You do not have permission to perform this action."],
        INVALID_STATUS_TRANSITION: [400, "Request cannot be fulfilled in its current status."],
        REQUEST_EXPIRED: [400, "This emergency request has expired."],
        PAYMENT_PENDING: [400, "Payment is pending."],
        INSUFFICIENT_BALANCE_FOR_ADJUSTMENT: [400, "Insufficient balance to cover price difference."],
      };
      if (errorMap[error.message]) {
        const [status, message] = errorMap[error.message];
        return res.status(status).json({ message });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------------
  // PUT /coordination/requests/:id/cancel
  // -------------------------------------------------------------------------
  static async cancelRequest(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (!ALLOWED_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ message: "Missing ID" });

      const result = await CoordinationService.cancelRequest(
        id,
        getFacilityId(req),
        isSuperAdmin(req)
      );

      return res.json({
        id: result.request.id,
        status: result.request.status,
        refund_amount: Number(result.refund_amount),
        balance_after: Number(result.balance_after),
      });
    } catch (error: any) {
      const errorMap: Record<string, [number, string]> = {
        REQUEST_NOT_FOUND: [404, "Request not found."],
        FORBIDDEN: [403, "You do not have permission to perform this action."],
        INVALID_STATUS_TRANSITION: [400, "Request cannot be canceled in its current status."],
      };
      if (errorMap[error.message]) {
        const [status, message] = errorMap[error.message];
        return res.status(status).json({ message });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}
