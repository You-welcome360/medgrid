import { prisma } from '@medgrid/database';
import {
  RequestStatus,
  RequestPriority,
  ResourceType,
  InventoryUnit,
} from '@medgrid/database';
import { Prisma } from '@medgrid/database/src/generated/prisma/client';

import type { CreateRequestDTO } from '@medgrid/shared';

// ===========================================================================
// Create
// ===========================================================================

export const createResourceRequest = async (
  data: CreateRequestDTO,
  requestingFacilityId: string,
  requestedById: string
) => {
  return prisma.resourceRequest.create({
    data: {
      requestingFacilityId,
      supplyingFacilityId: data.supplyingFacilityId,
      requestedById,
      resourceType: data.resourceType as ResourceType,
      itemName: data.itemName,
      quantity: data.quantity,
      unit: data.unit as InventoryUnit,
      priority: data.priority as RequestPriority,
      description: data.description,
      isEmergency: data.isEmergency ?? false,
      isBroadcast: data.isBroadcast ?? false,
      maxRadiusKm: data.maxRadiusKm ?? null,
      pricePerUnit: data.pricePerUnit ?? null,
      totalAmount: data.pricePerUnit ? (data.pricePerUnit * data.quantity) : null,
      paymentStatus: 'paid',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      patient: data.patient
        ? (data.patient as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
};

// ===========================================================================
// Queries
// ===========================================================================

export const findRequestById = async (id: string) => {
  return prisma.resourceRequest.findUnique({
    where: { id },
  });
};

export const findAllRequests = async (status?: RequestStatus) => {
  return prisma.resourceRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { requestedAt: 'desc' },
  });
};

export const findRequestsByFacility = async (
  facilityId: string,
  status?: RequestStatus
) => {
  return prisma.resourceRequest.findMany({
    where: {
      OR: [
        { requestingFacilityId: facilityId },
        { supplyingFacilityId: facilityId },
      ],
      ...(status ? { status } : {}),
    },
    orderBy: { requestedAt: 'desc' },
  });
};

// ===========================================================================
// Status transitions
// ===========================================================================

export const acceptRequest = async (id: string, handledById: string) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.ACCEPTED,
      handledById,
      acceptedAt: new Date(),
    },
  });
};

export const rejectRequest = async (
  id: string,
  handledById: string,
  reason: string
) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.REJECTED,
      handledById,
      rejectionReason: reason,
    },
  });
};

export const dispatchRequest = async (id: string, handledById: string) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.IN_TRANSIT,
      handledById,
      dispatchedAt: new Date(),
    },
  });
};

export const completeRequest = async (id: string) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
};

export const cancelRequest = async (id: string, reason: string) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.CANCELLED,
      cancellationReason: reason,
    },
  });
};

export const failRequest = async (id: string, handledById: string) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.FAILED,
      handledById,
    },
  });
};

export const findNearbyBroadcasts = async (
  facilityId: string,
  facilityLat: number,
  facilityLng: number,
  ignoreRadius: boolean = false
) => {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT 
      r.*,
      f.name as "requestingFacilityName",
      f.type as "requestingFacilityType",
      f.phone as "requestingFacilityPhone",
      f.email as "requestingFacilityEmail",
      f.region as "requestingFacilityRegion",
      f.district as "requestingFacilityDistrict",
      (
        6371 * acos(
          cos(radians(${facilityLat})) * 
          cos(radians(f.latitude)) * 
          cos(radians(f.longitude) - radians(${facilityLng})) + 
          sin(radians(${facilityLat})) * 
          sin(radians(f.latitude))
        )
      ) AS distance
    FROM "ResourceRequest" r
    JOIN "Facility" f ON r."requestingFacilityId" = f.id
    WHERE r."isBroadcast" = true
      AND r.status::text = 'PENDING'
      AND r."requestingFacilityId" <> ${facilityId}
      AND (r."declinedBy" IS NULL OR NOT (${facilityId} = ANY(r."declinedBy")))
      AND (
        ${ignoreRadius} = true OR
        (r."maxRadiusKm" IS NULL) OR 
        (
          6371 * acos(
            cos(radians(${facilityLat})) * 
            cos(radians(f.latitude)) * 
            cos(radians(f.longitude) - radians(${facilityLng})) + 
            sin(radians(${facilityLat})) * 
            sin(radians(f.latitude))
          ) <= r."maxRadiusKm"
        )
      )
    ORDER BY distance ASC
  `);
};

export const acceptBroadcastRequest = async (
  id: string,
  supplyingFacilityId: string,
  handledById: string
) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      supplyingFacilityId,
      status: RequestStatus.ACCEPTED,
      handledById,
      acceptedAt: new Date(),
    },
  });
};

export const declineBroadcastRequest = async (id: string, facilityId: string) => {
  return prisma.resourceRequest.update({
    where: { id },
    data: {
      declinedBy: {
        push: facilityId,
      },
    },
  });
};
