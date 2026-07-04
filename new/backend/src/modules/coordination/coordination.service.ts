import { prisma } from "../../config/prisma.js";
import { RESOURCE_ACCESS } from "../inventory/resource.rules.js";
import {
  CreateRequestInput,
  FulfillRequestInput,
  AcknowledgeRequestInput,
} from "./coordination.validation.js";
import { Prisma } from "@prisma/client";
import {
  notifyRequestCreated,
  notifyRequestAcknowledged,
  notifyRequestFulfilled,
  notifyRequestCanceled,
  notifyBalanceLow,
} from "../../services/notification.service.js";
import { env } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Haversine distance (km) between two lat/lng points
// ---------------------------------------------------------------------------
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class CoordinationService {
  // -------------------------------------------------------------------------
  // Create Request (normal + emergency)
  // -------------------------------------------------------------------------
  static async createRequest(
    userId: string,
    facilityId: string,
    input: CreateRequestInput
  ) {
    const isEmergency = input.classification === "emergency";

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch resource type
        const resourceType = await tx.resourceTypeInfo.findUnique({
          where: { id: input.resource_type_id },
        });
        if (!resourceType) throw new Error("RESOURCE_TYPE_NOT_FOUND");

        // 2. Fetch facility
        const facility = await tx.facility.findUnique({
          where: { id: facilityId },
        });
        if (!facility) throw new Error("FACILITY_NOT_FOUND");

        // 3. Verify resource type is allowed for facility type
        const allowed =
          RESOURCE_ACCESS[facility.type as keyof typeof RESOURCE_ACCESS];
        if (!allowed || !allowed.includes(resourceType.type)) {
          throw new Error("RESOURCE_NOT_ALLOWED");
        }

        // 4. Calculate cost
        const pricePerUnit = resourceType.defaultPrice;
        const totalCost = pricePerUnit.mul(input.quantity);

        // ---------------------------------------------------------------
        // NORMAL: upfront balance check + deduction
        // EMERGENCY: no balance check, payment deferred to fulfillment
        // ---------------------------------------------------------------
        let balanceAfter = facility.balance;

        if (!isEmergency) {
          if (facility.balance.lt(totalCost)) {
            throw new Error("INSUFFICIENT_BALANCE");
          }

          const updated = await tx.facility.update({
            where: { id: facilityId },
            data: { balance: { decrement: totalCost } },
          });
          balanceAfter = updated.balance;
        }

        // 5. Set expiry
        const now = new Date();
        const expiresAt = new Date(now);
        if (isEmergency) {
          expiresAt.setHours(expiresAt.getHours() + 4); // 4-hour emergency window
        } else {
          expiresAt.setDate(expiresAt.getDate() + 7); // 7-day normal window
        }

        // 6. Resolve timeframe_hours defaults
        const timeframeHours =
          input.timeframe_hours ?? (isEmergency ? 2 : 48);

        // 7. Create request
        const request = await tx.coordinationRequest.create({
          data: {
            facilityId,
            resourceTypeId: input.resource_type_id,
            quantity: input.quantity,
            classification: input.classification,
            urgencyLevel: input.urgency_level,
            broadcastRadiusKm: isEmergency
              ? input.broadcast_radius_km
              : null,
            timeframeHours,
            additionalNotes: input.additional_notes,
            status: "open",
            paymentStatus: isEmergency ? "pending" : "paid",
            pricePerUnit: isEmergency ? new Prisma.Decimal(0) : pricePerUnit,
            totalAmount: isEmergency ? new Prisma.Decimal(0) : totalCost,
            createdBy: userId,
            expiresAt,
          },
          include: { resourceType: true },
        });

        // 8. Record balance transaction for normal requests
        if (!isEmergency) {
          await tx.balanceTransaction.create({
            data: {
              facilityId,
              amount: totalCost.negated(),
              type: "deduction",
              reference: request.id,
              paymentMethod: "system",
              status: "completed",
              description: `Upfront payment for ${resourceType.name} (Qty: ${input.quantity})`,
            },
          });
        }

        return { request, balance_after: balanceAfter };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // Fire notifications after transaction commits (non-blocking)
    notifyRequestCreated(result.request.id).catch(() => {});

    // Low balance check for normal requests
    if (!isEmergency) {
      const bal = Number(result.balance_after);
      if (bal < env.BALANCE_LOW_THRESHOLD) {
        notifyBalanceLow(facilityId, bal).catch(() => {});
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Acknowledge Request (Emergency only)
  // -------------------------------------------------------------------------
  static async acknowledgeRequest(
    id: string,
    acknowledgingFacilityId: string,
    isSuperAdmin: boolean,
    _input: AcknowledgeRequestInput
  ) {
    const request = await prisma.coordinationRequest.findUnique({
      where: { id },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
      },
    });

    if (!request) throw new Error("REQUEST_NOT_FOUND");
    if (request.classification !== "emergency") {
      throw new Error("NOT_EMERGENCY_REQUEST");
    }
    if (request.status !== "open") {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    // Check expiry
    if (request.expiresAt && new Date() > request.expiresAt) {
      throw new Error("REQUEST_EXPIRED");
    }

    // A facility cannot acknowledge its own request
    if (!isSuperAdmin && request.facilityId === acknowledgingFacilityId) {
      throw new Error("CANNOT_ACKNOWLEDGE_OWN_REQUEST");
    }

    const updated = await prisma.coordinationRequest.update({
      where: { id },
      data: {
        status: "acknowledged",
        acknowledgedBy: acknowledgingFacilityId,
        acknowledgedAt: new Date(),
      },
      include: {
        acknowledgingFacility: { select: { id: true, name: true } },
      },
    });

    // Fire notification (non-blocking)
    notifyRequestAcknowledged(id).catch(() => {});

    return updated;
  }

  // -------------------------------------------------------------------------
  // Get Requests (with classification filter support)
  // -------------------------------------------------------------------------
  static async getRequests(
    facilityId: string,
    isSuperAdmin: boolean,
    filters: {
      status?: string;
      urgency_level?: string;
      resource_type_id?: string;
      classification?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CoordinationRequestWhereInput = {};
    if (!isSuperAdmin) {
      where.facilityId = facilityId;
    }
    if (filters.status) where.status = filters.status;
    if (filters.urgency_level) where.urgencyLevel = filters.urgency_level;
    if (filters.resource_type_id) where.resourceTypeId = filters.resource_type_id;
    if (filters.classification) where.classification = filters.classification;

    const [requests, total] = await Promise.all([
      prisma.coordinationRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { resourceType: true },
      }),
      prisma.coordinationRequest.count({ where }),
    ]);

    return { requests, pagination: { page, limit, total } };
  }

  // -------------------------------------------------------------------------
  // Get Request By ID
  // -------------------------------------------------------------------------
  static async getRequestById(
    id: string,
    facilityId: string,
    isSuperAdmin: boolean
  ) {
    const request = await prisma.coordinationRequest.findUnique({
      where: { id },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
        creator: { select: { id: true, email: true } },
        acknowledgingFacility: { select: { id: true, name: true } },
        fulfillmentFacility: { select: { id: true, name: true } },
      },
    });

    if (!request) throw new Error("REQUEST_NOT_FOUND");
    if (!isSuperAdmin && request.facilityId !== facilityId) {
      const isEmergency = request.classification === "emergency";
      const isAcknowledgee = request.acknowledgedBy === facilityId;
      const isFulfiller = request.fulfilledBy === facilityId;

      if (!isEmergency && !isAcknowledgee && !isFulfiller) {
        throw new Error("FORBIDDEN");
      }
    }

    return request;
  }

  // -------------------------------------------------------------------------
  // Get Nearby Emergency Requests
  // -------------------------------------------------------------------------
  static async getNearbyRequests(
    facilityId: string,
    radiusKm: number,
    statusFilter?: string
  ) {
    // Fetch the requesting facility's coordinates
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { latitude: true, longitude: true },
    });

    if (!facility) throw new Error("FACILITY_NOT_FOUND");
    if (facility.latitude === null || facility.longitude === null) {
      throw new Error("FACILITY_LOCATION_NOT_SET");
    }

    const now = new Date();

    // Fetch open/acknowledged emergency requests (not own, not expired)
    const where: Prisma.CoordinationRequestWhereInput = {
      classification: "emergency",
      facilityId: { not: facilityId }, // exclude own requests
      expiresAt: { gt: now },           // not expired
    };

    if (statusFilter) {
      where.status = statusFilter;
    } else {
      where.status = { in: ["open", "acknowledged"] };
    }

    const requests = await prisma.coordinationRequest.findMany({
      where,
      include: {
        resourceType: true,
        facility: {
          select: { id: true, name: true, latitude: true, longitude: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by Haversine distance and attach distance_km
    const nearby = requests
      .filter((r) => {
        const lat = r.facility.latitude;
        const lon = r.facility.longitude;
        if (lat === null || lon === null) return false;
        return (
          haversineKm(
            facility.latitude!,
            facility.longitude!,
            lat,
            lon
          ) <= radiusKm
        );
      })
      .map((r) => {
        const distanceKm = haversineKm(
          facility.latitude!,
          facility.longitude!,
          r.facility.latitude!,
          r.facility.longitude!
        );
        return {
          id: r.id,
          facility_id: r.facilityId,
          facility_name: r.facility.name,
          resource_type_id: r.resourceTypeId,
          resource_name: r.resourceType.name,
          quantity: r.quantity,
          urgency_level: r.urgencyLevel,
          broadcast_radius_km: r.broadcastRadiusKm,
          distance_km: Math.round(distanceKm * 10) / 10,
          status: r.status,
          expires_at: r.expiresAt,
          created_at: r.createdAt,
        };
      })
      // Sort nearest first
      .sort((a, b) => a.distance_km - b.distance_km);

    return nearby;
  }

  // -------------------------------------------------------------------------
  // Fulfill Request (normal + emergency)
  // -------------------------------------------------------------------------
  static async fulfillRequest(
    id: string,
    facilityId: string,
    isSuperAdmin: boolean,
    userId: string,
    input: FulfillRequestInput
  ) {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch request
        const request = await tx.coordinationRequest.findUnique({
          where: { id },
          include: { resourceType: true },
        });
        if (!request) throw new Error("REQUEST_NOT_FOUND");

        const isEmergency = request.classification === "emergency";

        // 2. Access validation for normal (must be own facility, unless super admin)
        if (!isEmergency && !isSuperAdmin && request.facilityId !== facilityId) {
          throw new Error("FORBIDDEN");
        }

        // 3. Status validation
        const validStatuses = isEmergency
          ? ["acknowledged", "in_progress"]
          : ["open", "in_progress"];

        if (!validStatuses.includes(request.status)) {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        // 4. Check expiry for emergency requests
        if (isEmergency && request.expiresAt && new Date() > request.expiresAt) {
          throw new Error("REQUEST_EXPIRED");
        }

        // 5. Normal: payment must already be paid
        if (!isEmergency && request.paymentStatus !== "paid") {
          throw new Error("PAYMENT_PENDING");
        }

        const respondingFacilityId =
          input.responding_facility_id || request.fulfilledBy || facilityId;

        const quantityFulfilled = input.quantity_fulfilled || request.quantity;

        // ---------------------------------------------------------------
        // 6. Pricing
        // ---------------------------------------------------------------
        let finalPricePerUnit: Prisma.Decimal;

        if (isEmergency) {
          // For emergency: caller must supply price_per_unit if resource is sellable
          // Blood has price 0; drugs/supplies require a price
          const isSellable = !["BLOOD", "ICU_BED", "VENTILATOR", "OPERATING_THEATRE"].includes(
            request.resourceType.type
          );

          if (isSellable && input.price_per_unit === undefined) {
            // Try to pull from responder's inventory
            const matchingItem = await tx.inventoryItem.findFirst({
              where: {
                facilityId: respondingFacilityId,
                resourceType: request.resourceType.type,
              },
            });
            finalPricePerUnit =
              matchingItem?.price ?? new Prisma.Decimal(0);
          } else {
            finalPricePerUnit = new Prisma.Decimal(input.price_per_unit ?? 0);
          }
        } else {
          // Normal: use original price unless overridden
          finalPricePerUnit = new Prisma.Decimal(
            request.pricePerUnit || 0
          );

          if (input.price_per_unit !== undefined) {
            finalPricePerUnit = new Prisma.Decimal(input.price_per_unit);
          } else if (respondingFacilityId) {
            const matchingItem = await tx.inventoryItem.findFirst({
              where: {
                facilityId: respondingFacilityId,
                resourceType: request.resourceType.type,
                name: { equals: request.resourceType.name, mode: "insensitive" },
              },
            });
            if (matchingItem?.price) {
              finalPricePerUnit = matchingItem.price;
            }
          }
        }

        const finalTotalAmount = finalPricePerUnit.mul(quantityFulfilled);

        // ---------------------------------------------------------------
        // 7. Balance settlement
        // ---------------------------------------------------------------
        if (isEmergency) {
          // Post-fulfillment deduction — can go negative
          const updatedRequester = await tx.facility.update({
            where: { id: request.facilityId },
            data: { balance: { decrement: finalTotalAmount } },
          });

          if (finalTotalAmount.gt(0)) {
            await tx.balanceTransaction.create({
              data: {
                facilityId: request.facilityId,
                amount: finalTotalAmount.negated(),
                type: "deduction",
                reference: request.id,
                paymentMethod: "system",
                status: "completed",
                description: `Emergency fulfillment: ${request.resourceType.name} (Qty: ${quantityFulfilled})`,
              },
            });
          }

          // Pay responder
          if (
            respondingFacilityId !== request.facilityId &&
            finalTotalAmount.gt(0)
          ) {
            await tx.facility.update({
              where: { id: respondingFacilityId },
              data: { balance: { increment: finalTotalAmount } },
            });
            await tx.balanceTransaction.create({
              data: {
                facilityId: respondingFacilityId,
                amount: finalTotalAmount,
                type: "topup",
                reference: request.id,
                paymentMethod: "system",
                status: "completed",
                description: `Emergency fulfillment payout: ${request.resourceType.name} (Qty: ${quantityFulfilled})`,
              },
            });
          }

          // 8. Deduct responding facility's inventory
          const matchingItem = await tx.inventoryItem.findFirst({
            where: {
              facilityId: respondingFacilityId,
              resourceType: request.resourceType.type,
            },
          });

          if (matchingItem) {
            if (matchingItem.isMovable) {
              await tx.inventoryItem.update({
                where: { id: matchingItem.id },
                data: { quantity: { decrement: quantityFulfilled } },
              });
            } else {
              await tx.inventoryItem.update({
                where: { id: matchingItem.id },
                data: { available: { decrement: quantityFulfilled } },
              });
            }
            await tx.inventoryAudit.create({
              data: {
                inventoryItemId: matchingItem.id,
                changedBy: userId,
                newValue: {
                  ...matchingItem,
                  quantity: matchingItem.isMovable
                    ? (matchingItem.quantity || 0) - quantityFulfilled
                    : matchingItem.quantity,
                  available: !matchingItem.isMovable
                    ? (matchingItem.available || 0) - quantityFulfilled
                    : matchingItem.available,
                } as any,
              },
            });
          }

          // 9. Fetch updated requester balance for response
          const requesterAfter = await tx.facility.findUnique({
            where: { id: request.facilityId },
            select: { balance: true },
          });

          // 10. Update request status
          const updatedRequest = await tx.coordinationRequest.update({
            where: { id },
            data: {
              status: "fulfilled",
              fulfilledAt: new Date(),
              fulfilledBy: respondingFacilityId,
              pricePerUnit: finalPricePerUnit,
              totalAmount: finalTotalAmount,
              paymentStatus: "paid",
            },
          });

          return {
            request: updatedRequest,
            balance_after: requesterAfter?.balance ?? updatedRequester.balance,
          };
        } else {
          // Normal fulfillment (Phase 1 logic with price adjustment)
          const originalTotalAmount = new Prisma.Decimal(request.totalAmount || 0);
          const priceDiff = finalTotalAmount.sub(originalTotalAmount);

          if (priceDiff.gt(0)) {
            const requester = await tx.facility.findUnique({
              where: { id: request.facilityId },
            });
            if (!requester || requester.balance.lt(priceDiff)) {
              throw new Error("INSUFFICIENT_BALANCE_FOR_ADJUSTMENT");
            }
            await tx.facility.update({
              where: { id: request.facilityId },
              data: { balance: { decrement: priceDiff } },
            });
            await tx.balanceTransaction.create({
              data: {
                facilityId: request.facilityId,
                amount: priceDiff.negated(),
                type: "deduction",
                reference: request.id,
                paymentMethod: "system",
                status: "completed",
                description: `Price adjustment for ${request.resourceType.name} (Debit diff)`,
              },
            });
          } else if (priceDiff.lt(0)) {
            const refundAmt = priceDiff.abs();
            await tx.facility.update({
              where: { id: request.facilityId },
              data: { balance: { increment: refundAmt } },
            });
            await tx.balanceTransaction.create({
              data: {
                facilityId: request.facilityId,
                amount: refundAmt,
                type: "topup",
                reference: request.id,
                paymentMethod: "system",
                status: "completed",
                description: `Price adjustment for ${request.resourceType.name} (Credit diff)`,
              },
            });
          }

          // Deduct inventory from responding facility
          if (respondingFacilityId) {
            const matchingItem = await tx.inventoryItem.findFirst({
              where: {
                facilityId: respondingFacilityId,
                resourceType: request.resourceType.type,
                name: { equals: request.resourceType.name, mode: "insensitive" },
              },
            });
            if (matchingItem) {
              if (matchingItem.isMovable) {
                await tx.inventoryItem.update({
                  where: { id: matchingItem.id },
                  data: { quantity: { decrement: quantityFulfilled } },
                });
              } else {
                await tx.inventoryItem.update({
                  where: { id: matchingItem.id },
                  data: { available: { decrement: quantityFulfilled } },
                });
              }
              await tx.inventoryAudit.create({
                data: {
                  inventoryItemId: matchingItem.id,
                  changedBy: userId,
                  newValue: {
                    ...matchingItem,
                    quantity: matchingItem.isMovable
                      ? (matchingItem.quantity || 0) - quantityFulfilled
                      : matchingItem.quantity,
                    available: !matchingItem.isMovable
                      ? (matchingItem.available || 0) - quantityFulfilled
                      : matchingItem.available,
                  } as any,
                },
              });
            }
          }

          // Pay responding facility
          if (respondingFacilityId && respondingFacilityId !== request.facilityId) {
            await tx.facility.update({
              where: { id: respondingFacilityId },
              data: { balance: { increment: finalTotalAmount } },
            });
            await tx.balanceTransaction.create({
              data: {
                facilityId: respondingFacilityId,
                amount: finalTotalAmount,
                type: "topup",
                reference: request.id,
                paymentMethod: "system",
                status: "completed",
                description: `Fulfillment payout for ${request.resourceType.name} (Qty: ${quantityFulfilled})`,
              },
            });
          }

          const updatedRequest = await tx.coordinationRequest.update({
            where: { id },
            data: {
              status: "fulfilled",
              fulfilledAt: new Date(),
              fulfilledBy: respondingFacilityId,
              pricePerUnit: finalPricePerUnit,
              totalAmount: finalTotalAmount,
            },
          });

          return { request: updatedRequest, balance_after: null };
        }
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // Fire notifications after transaction commits (non-blocking)
    notifyRequestFulfilled(id).catch(() => {});

    // Low balance check after emergency post-delivery deduction
    if (result.balance_after !== null) {
      const bal = Number(result.balance_after);
      if (bal < env.BALANCE_LOW_THRESHOLD) {
        prisma.coordinationRequest
          .findUnique({ where: { id }, select: { facilityId: true } })
          .then((r) => {
            if (r) notifyBalanceLow(r.facilityId, bal).catch(() => {});
          })
          .catch(() => {});
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Cancel Request
  // -------------------------------------------------------------------------
  static async cancelRequest(
    id: string,
    facilityId: string,
    isSuperAdmin: boolean
  ) {
    const result = await prisma.$transaction(
      async (tx) => {
        const request = await tx.coordinationRequest.findUnique({
          where: { id },
          include: { resourceType: true },
        });

        if (!request) throw new Error("REQUEST_NOT_FOUND");

        if (!isSuperAdmin && request.facilityId !== facilityId) {
          throw new Error("FORBIDDEN");
        }

        if (!["open", "in_progress", "acknowledged"].includes(request.status)) {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        const isEmergency = request.classification === "emergency";
        const totalAmountToRefund = new Prisma.Decimal(request.totalAmount || 0);

        const updatedRequest = await tx.coordinationRequest.update({
          where: { id },
          data: { status: "canceled" },
        });

        // Only refund for normal requests (emergency had no upfront payment)
        let updatedFacility = await tx.facility.findUnique({
          where: { id: request.facilityId },
          select: { balance: true },
        });

        if (!isEmergency && totalAmountToRefund.gt(0)) {
          const updated = await tx.facility.update({
            where: { id: request.facilityId },
            data: { balance: { increment: totalAmountToRefund } },
          });
          await tx.balanceTransaction.create({
            data: {
              facilityId: request.facilityId,
              amount: totalAmountToRefund,
              type: "topup",
              reference: request.id,
              paymentMethod: "system",
              status: "completed",
              description: `Refund for canceled request: ${request.resourceType.name}`,
            },
          });
          updatedFacility = { balance: updated.balance };
        }

        return {
          request: updatedRequest,
          refund_amount: isEmergency ? new Prisma.Decimal(0) : totalAmountToRefund,
          balance_after: updatedFacility?.balance ?? new Prisma.Decimal(0),
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // Fire notifications (non-blocking)
    notifyRequestCanceled(id, Number(result.refund_amount)).catch(() => {});

    return result;
  }
}
