import { writeAuditLog, AuditAction, prisma, Prisma } from '@medgrid/database';
import {
  createNotFoundError,
  createAuthorizationError,
  createValidationError,
  type CreateRequestDTO,
  type ResourceRequestDTO,
  type RejectRequestDTO,
  type CancelRequestDTO,
  RequestStatus,
  ResourceType,
  RequestPriority,
  InventoryUnit,
} from '@medgrid/shared';

import {
  notifyRequestCreated,
  notifyRequestAcknowledged,
  notifyRequestFulfilled,
  notifyRequestCanceled,
} from '@medgrid/notifications';

import {
  createResourceRequest,
  findRequestById,
  findAllRequests,
  findRequestsByFacility,
  acceptRequest,
  rejectRequest,
  dispatchRequest,
  completeRequest,
  cancelRequest,
  failRequest,
  findNearbyBroadcasts,
  acceptBroadcastRequest,
  declineBroadcastRequest,
} from './request.repository';
import {
  lookupInventoryItem,
  createInventoryForTransfer,
  recordInternalStockMovement,
  getFacilityDetails,
  getFacilityInventorySummary,
} from '../../clients/facility.client';

// ===========================================================================
// Mapper
// ===========================================================================

const toResourceRequestDTO = (
  req: Awaited<ReturnType<typeof findRequestById>>
): ResourceRequestDTO => {
  if (!req) {
    throw createNotFoundError('Resource request not found');
  }

  return {
    id: req.id,
    requestingFacilityId: req.requestingFacilityId,
    supplyingFacilityId: req.supplyingFacilityId,
    requestedById: req.requestedById,
    handledById: req.handledById,
    resourceType: req.resourceType as unknown as ResourceType,
    itemName: req.itemName,
    quantity: req.quantity,
    unit: req.unit as unknown as InventoryUnit,
    priority: req.priority as unknown as RequestPriority,
    status: req.status as unknown as RequestStatus,
    description: req.description,
    patient: req.patient as ResourceRequestDTO['patient'],
    rejectionReason: req.rejectionReason,
    cancellationReason: req.cancellationReason,
    isEmergency: req.isEmergency,
    isBroadcast: req.isBroadcast,
    maxRadiusKm: req.maxRadiusKm,
    declinedBy: req.declinedBy,
    pricePerUnit: req.pricePerUnit ? Number(req.pricePerUnit) : null,
    totalAmount: req.totalAmount ? Number(req.totalAmount) : null,
    paymentStatus: req.paymentStatus,
    transactionId: req.transactionId,
    expiresAt: req.expiresAt?.toISOString() ?? null,
    requestedAt: req.requestedAt.toISOString(),
    acceptedAt: req.acceptedAt?.toISOString() ?? null,
    dispatchedAt: req.dispatchedAt?.toISOString() ?? null,
    completedAt: req.completedAt?.toISOString() ?? null,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  };
};

// ===========================================================================
// Guards
// ===========================================================================

const assertStatus = (
  request: Awaited<ReturnType<typeof findRequestById>>,
  allowed: RequestStatus[],
  message: string
) => {
  if (!request) throw createNotFoundError('Resource request not found');

  if (!allowed.includes(request.status as unknown as RequestStatus)) {
    throw createValidationError(message);
  }
};

const assertSupplier = (
  request: Awaited<ReturnType<typeof findRequestById>>,
  facilityId: string
) => {
  if (!request) throw createNotFoundError('Resource request not found');

  if (request.supplyingFacilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }
};

const assertRequester = (
  request: Awaited<ReturnType<typeof findRequestById>>,
  facilityId: string
) => {
  if (!request) throw createNotFoundError('Resource request not found');

  if (request.requestingFacilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }
};

// ===========================================================================
// Service functions
// ===========================================================================

const refundRequest = async (txClient: any, request: any, reason: string) => {
  if (request.totalAmount && Number(request.totalAmount) > 0) {
    const totalAmount = Number(request.totalAmount);
    
    // Credit requester
    await txClient.facility.update({
      where: { id: request.requestingFacilityId },
      data: { balance: { increment: totalAmount } },
    });

    // Create transaction log
    await txClient.balanceTransaction.create({
      data: {
        facilityId: request.requestingFacilityId,
        amount: totalAmount,
        type: 'credit',
        reference: `req_${request.id}`,
        paymentMethod: 'system',
        status: 'success',
        description: `Refund for request rejection/cancellation: ${request.itemName} (Reason: ${reason})`,
      },
    });
  }
};

export const createRequest = async (
  data: CreateRequestDTO,
  requestingFacilityId: string,
  requestedById: string
): Promise<ResourceRequestDTO> => {
  if (data.supplyingFacilityId === requestingFacilityId) {
    throw createValidationError(
      'Cannot request resources from your own facility'
    );
  }

  let request: any;

  await prisma.$transaction(async (tx) => {
    // 1. Get requester
    const requester = await tx.facility.findUnique({
      where: { id: requestingFacilityId },
    });
    if (!requester) {
      throw createNotFoundError('Requesting facility not found');
    }

    // 2. Resolve unit price
    let pricePerUnit = 0;
    if (data.supplyingFacilityId) {
      const supplierItem = await tx.inventory.findFirst({
        where: {
          facilityId: data.supplyingFacilityId,
          resourceType: data.resourceType as ResourceType,
          itemName: data.itemName,
          deletedAt: null,
        },
      });
      pricePerUnit = supplierItem?.price ? Number(supplierItem.price) : 0;
    } else {
      // Broadcast: check network baseline
      const networkItem = await tx.inventory.findFirst({
        where: {
          resourceType: data.resourceType as ResourceType,
          itemName: data.itemName,
          deletedAt: null,
          price: { not: null },
        },
      });
      pricePerUnit = networkItem?.price ? Number(networkItem.price) : 0;
    }

    const totalCost = pricePerUnit * data.quantity;
    const balance = Number(requester.balance);
    const isEmergency = data.isEmergency ?? false;

    // 3. Balance verification
    if (!isEmergency) {
      if (balance < totalCost) {
        throw createValidationError('Insufficient facility balance to place this request');
      }
    } else {
      if (balance < 0) {
        throw createValidationError('Facility balance is negative. Emergency request cannot be placed.');
      }
    }

    // 4. Deduct balance
    await tx.facility.update({
      where: { id: requestingFacilityId },
      data: { balance: { decrement: totalCost } },
    });

    // 5. Create Resource Request record
    request = await tx.resourceRequest.create({
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
        isEmergency: isEmergency,
        isBroadcast: data.isBroadcast ?? false,
        maxRadiusKm: data.maxRadiusKm ?? null,
        pricePerUnit,
        totalAmount: totalCost,
        paymentStatus: 'paid',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        patient: data.patient
          ? (data.patient as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    // 6. Log transaction record with real request reference ID
    await tx.balanceTransaction.create({
      data: {
        facilityId: requestingFacilityId,
        amount: totalCost,
        type: 'debit',
        reference: `req_${request.id}`,
        paymentMethod: 'system',
        status: 'success',
        description: `${isEmergency ? 'Emergency' : 'Standard'} escrow payment for ${data.itemName} (Qty: ${data.quantity})`,
      },
    });
  });

  await writeAuditLog({
    actorId: requestedById,
    actorRole: 'COORDINATION_MANAGER',
    action: AuditAction.REQUEST_CREATED,
    entityType: 'ResourceRequest',
    entityId: request.id,
    facilityId: requestingFacilityId,
    newValue: {
      resourceType: request.resourceType,
      itemName: request.itemName,
      quantity: request.quantity,
      priority: request.priority,
      supplyingFacilityId: request.supplyingFacilityId,
    },
  });

  notifyRequestCreated(request.id).catch((err) =>
    console.error('[Notify] notifyRequestCreated failed:', err.message)
  );

  return toResourceRequestDTO(request);
};

export const getRequests = async (
  facilityId: string | null,
  status?: RequestStatus
): Promise<ResourceRequestDTO[]> => {
  // Dynamically check and clean up expired pending requests
  await expirePendingRequests().catch((err) =>
    console.error('[Scheduler] expirePendingRequests failed:', err.message)
  );

  const requests = facilityId
    ? await findRequestsByFacility(facilityId, status)
    : await findAllRequests(status);

  return requests.map(toResourceRequestDTO);
};

export const getRequestById = async (
  id: string,
  facilityId: string | null
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  if (!request) {
    throw createNotFoundError('Resource request not found');
  }

  // SUPER_ADMIN passes null facilityId — unrestricted
  if (facilityId !== null) {
    const isInvolved =
      request.requestingFacilityId === facilityId ||
      request.supplyingFacilityId === facilityId;

    if (!isInvolved) {
      throw createAuthorizationError('Access denied');
    }
  }

  return toResourceRequestDTO(request);
};

export const accept = async (
  id: string,
  supplyingFacilityId: string,
  handledById: string
): Promise<ResourceRequestDTO & { reservedThresholdWarning?: string }> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.PENDING],
    'Only pending requests can be accepted'
  );
  assertSupplier(request, supplyingFacilityId);

  // Check reserved threshold — soft fail (warn, don't block)
  let reservedThresholdWarning: string | undefined;

  const supplierItem = await lookupInventoryItem(
    supplyingFacilityId,
    request!.itemName,
    request!.resourceType
  );

  if (supplierItem) {
    const stockAfterFulfillment = supplierItem.currentStock - request!.quantity;

    if (
      supplierItem.reservedThreshold !== null &&
      stockAfterFulfillment < supplierItem.reservedThreshold
    ) {
      reservedThresholdWarning =
        `Warning: Fulfilling this request (${request!.quantity} ${request!.unit.toLowerCase()}) ` +
        `would reduce your stock of "${supplierItem.itemName}" to ${stockAfterFulfillment} ` +
        `units, below your reserved threshold of ${supplierItem.reservedThreshold}.`;
    }
  }

  const updated = await acceptRequest(id, handledById);

  await writeAuditLog({
    actorId: handledById,
    action: AuditAction.REQUEST_ACCEPTED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
    newValue: reservedThresholdWarning
      ? { reservedThresholdWarning }
      : undefined,
  });

  notifyRequestAcknowledged(id).catch((err) =>
    console.error('[Notify] notifyRequestAcknowledged failed:', err.message)
  );

  return {
    ...toResourceRequestDTO(updated),
    reservedThresholdWarning,
  };
};

export const reject = async (
  id: string,
  supplyingFacilityId: string,
  handledById: string,
  data: RejectRequestDTO
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.PENDING, RequestStatus.ACCEPTED],
    'Only pending or accepted requests can be rejected'
  );
  assertSupplier(request, supplyingFacilityId);

  let updated: any;
  await prisma.$transaction(async (tx) => {
    updated = await tx.resourceRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        handledById,
        rejectionReason: data.reason,
      },
    });

    await refundRequest(tx, request, data.reason);
  });

  await writeAuditLog({
    actorId: handledById,
    action: AuditAction.REQUEST_REJECTED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
    newValue: { reason: data.reason },
  });

  return toResourceRequestDTO(updated);
};

export const dispatch = async (
  id: string,
  supplyingFacilityId: string,
  handledById: string
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.ACCEPTED],
    'Only accepted requests can be dispatched'
  );
  assertSupplier(request, supplyingFacilityId);

  const updated = await dispatchRequest(id, handledById);

  await writeAuditLog({
    actorId: handledById,
    action: AuditAction.REQUEST_DISPATCHED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
    newValue: { dispatchedAt: updated.dispatchedAt?.toISOString() },
  });

  // Deduct stock from supplier at dispatch time
  const supplierItem = await lookupInventoryItem(
    supplyingFacilityId,
    request!.itemName,
    request!.resourceType
  );

  if (supplierItem) {
    await recordInternalStockMovement(
      supplierItem.inventoryId,
      supplyingFacilityId,
      -request!.quantity,
      'TRANSFER_OUT',
      `Dispatched for resource request ${id}`,
      handledById,
      id
    );
  } else {
    console.warn(
      `[coordination] dispatch: supplier item "${request!.itemName}" not found for facility ${supplyingFacilityId}. Supplier stock not reduced.`
    );
  }

  return toResourceRequestDTO(updated);
};

export const confirmReceipt = async (
  id: string,
  requestingFacilityId: string,
  confirmedById: string
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.IN_TRANSIT],
    'Only in-transit requests can be confirmed'
  );
  assertRequester(request, requestingFacilityId);

  const updated = await completeRequest(id);

  await writeAuditLog({
    actorId: confirmedById,
    action: AuditAction.REQUEST_COMPLETED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: requestingFacilityId,
    newValue: { completedAt: updated.completedAt?.toISOString() },
  });

  // Perform financial settlement if price is set
  if (request!.totalAmount && Number(request!.totalAmount) > 0 && request!.supplyingFacilityId) {
    const totalAmount = Number(request!.totalAmount);
    await prisma.$transaction(async (txClient: any) => {
      // 1. Credit supplier
      await txClient.facility.update({
        where: { id: request!.supplyingFacilityId! },
        data: { balance: { increment: totalAmount } },
      });

      // 2. Create transaction for supplier
      await txClient.balanceTransaction.create({
        data: {
          facilityId: request!.supplyingFacilityId!,
          amount: totalAmount,
          type: 'credit',
          reference: `req_${request!.id}`,
          paymentMethod: 'system',
          status: 'success',
          description: `Fulfillment settlement: ${request!.itemName} (Qty: ${request!.quantity})`,
        },
      });
    });
  }

  // Stock movements on confirm receipt:
  //   - TRANSFER_OUT already happened at dispatch time
  //   - We only do TRANSFER_IN to requester here
  if (request!.supplyingFacilityId) {
    const supplierItem = await lookupInventoryItem(
      request!.supplyingFacilityId,
      request!.itemName,
      request!.resourceType
    );

    // Ensure requester has the item — create from supplier metadata if missing
    let requesterItem = await lookupInventoryItem(
      requestingFacilityId,
      request!.itemName,
      request!.resourceType
    );

    if (!requesterItem && supplierItem) {
      const created = await createInventoryForTransfer(
        requestingFacilityId,
        request!.itemName,
        request!.resourceType,
        supplierItem.unit,
        supplierItem.metadata,
        confirmedById
      );

      if (created) {
        requesterItem = {
          inventoryId: created.inventoryId,
          facilityId: requestingFacilityId,
          itemName: request!.itemName,
          resourceType: request!.resourceType,
          unit: supplierItem.unit,
          metadata: supplierItem.metadata,
          currentStock: 0,
          reservedThreshold: null,
          isMovable: supplierItem.isMovable,
        };
      }
    }

    if (requesterItem) {
      await recordInternalStockMovement(
        requesterItem.inventoryId,
        requestingFacilityId,
        request!.quantity,
        'TRANSFER_IN',
        `Received resource request ${id}`,
        confirmedById,
        id
      );
    }
  }

  notifyRequestFulfilled(id).catch((err) =>
    console.error('[Notify] notifyRequestFulfilled failed:', err.message)
  );

  return toResourceRequestDTO(updated);
};

export const cancel = async (
  id: string,
  requestingFacilityId: string,
  cancelledById: string,
  data: CancelRequestDTO
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.PENDING],
    'Only pending requests can be cancelled'
  );
  assertRequester(request, requestingFacilityId);

  let updated: any;
  await prisma.$transaction(async (tx) => {
    updated = await tx.resourceRequest.update({
      where: { id },
      data: {
        status: RequestStatus.CANCELLED,
        cancellationReason: data.reason,
      },
    });

    await refundRequest(tx, request, data.reason);
  });

  await writeAuditLog({
    actorId: cancelledById,
    action: AuditAction.REQUEST_CANCELLED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: requestingFacilityId,
    newValue: { reason: data.reason },
  });

  notifyRequestCanceled(id, 0).catch((err) =>
    console.error('[Notify] notifyRequestCanceled failed:', err.message)
  );

  return toResourceRequestDTO(updated);
};

export const markFailed = async (
  id: string,
  supplyingFacilityId: string,
  handledById: string
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.IN_TRANSIT],
    'Only in-transit requests can be marked as failed'
  );
  assertSupplier(request, supplyingFacilityId);

  const updated = await failRequest(id, handledById);

  await writeAuditLog({
    actorId: handledById,
    action: AuditAction.REQUEST_FAILED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
  });

  return toResourceRequestDTO(updated);
};

export const getBroadcastsForFacility = async (
  facilityId: string,
  ignoreRadius: boolean = false
): Promise<ResourceRequestDTO[]> => {
  const facility = await getFacilityDetails(facilityId);
  if (!facility) {
    throw createNotFoundError('Active facility not found');
  }

  // Always fetch inventory regardless of ignoreRadius — suppliers must have the item to see the broadcast
  const inventorySummary = await getFacilityInventorySummary(facilityId);

  // Build a lookup map: "itemName:resourceType" -> { currentStock, isMovable }
  const inventoryMap = new Map<string, { currentStock: number; isMovable: boolean }>();
  for (const item of inventorySummary) {
    const key = `${item.itemName.trim().toLowerCase()}:${item.resourceType}`;
    const existing = inventoryMap.get(key);
    // Accumulate stock for duplicate entries (same item, multiple batches)
    inventoryMap.set(key, {
      currentStock: (existing?.currentStock ?? 0) + item.currentStock,
      isMovable: item.isMovable,
    });
  }

  const broadcasts = await findNearbyBroadcasts(
    facilityId,
    facility.latitude,
    facility.longitude,
    ignoreRadius
  );

  // Filter broadcasts: supplier must have the item in stock AND it must be movable
  const filtered = broadcasts.filter((b) => {
    const key = `${b.itemName.trim().toLowerCase()}:${b.resourceType}`;
    const stock = inventoryMap.get(key);
    if (!stock) return false;              // facility doesn't carry this item
    if (!stock.isMovable) return false;    // item is immovable (beds, heavy equipment)
    if (stock.currentStock < b.quantity) return false; // insufficient stock
    return true;
  });

  return filtered.map((b) => ({
    ...toResourceRequestDTO(b),
    distance: b.distance,
    requestingFacilityName: b.requestingFacilityName,
    requestingFacilityPhone: b.requestingFacilityPhone,
    requestingFacilityEmail: b.requestingFacilityEmail,
    requestingFacilityType: b.requestingFacilityType,
    requestingFacilityRegion: b.requestingFacilityRegion,
    requestingFacilityDistrict: b.requestingFacilityDistrict,
  } as any));
};

export const claimBroadcast = async (
  id: string,
  supplyingFacilityId: string,
  handledById: string
): Promise<ResourceRequestDTO & { reservedThresholdWarning?: string }> => {
  const request = await findRequestById(id);
  if (!request) {
    throw createNotFoundError('Broadcast request not found');
  }

  if (!request.isBroadcast) {
    throw createValidationError('Selected request is not a broadcast request');
  }

  assertStatus(
    request,
    [RequestStatus.PENDING],
    'Only pending broadcast requests can be claimed'
  );

  if (request.requestingFacilityId === supplyingFacilityId) {
    throw createValidationError('Cannot claim your own broadcast request');
  }

  const supplierItem = await lookupInventoryItem(
    supplyingFacilityId,
    request.itemName,
    request.resourceType
  );

  if (!supplierItem || supplierItem.currentStock < request.quantity) {
    throw createValidationError('Your facility does not have enough stock of this item to fulfill the request');
  }

  let reservedThresholdWarning: string | undefined;
  const stockAfterFulfillment = supplierItem.currentStock - request.quantity;
  if (
    supplierItem.reservedThreshold !== null &&
    stockAfterFulfillment < supplierItem.reservedThreshold
  ) {
    reservedThresholdWarning =
      `Warning: Fulfilling this request (${request.quantity} ${request.unit.toLowerCase()}) ` +
      `would reduce your stock of "${supplierItem.itemName}" to ${stockAfterFulfillment} ` +
      `units, below your reserved threshold of ${supplierItem.reservedThreshold}.`;
  }

  const supplierPrice = supplierItem.price ? Number(supplierItem.price) : 0;
  const actualTotalCost = supplierPrice * request.quantity;
  const diff = actualTotalCost - Number(request.totalAmount ?? 0);

  let updated: any;

  await prisma.$transaction(async (tx) => {
    // 1. Process balance adjustment for requester
    if (diff > 0) {
      const requester = await tx.facility.findUnique({
        where: { id: request.requestingFacilityId },
      });
      if (!requester) {
        throw createNotFoundError('Requesting facility not found');
      }

      const balance = Number(requester.balance);
      if (!request.isEmergency && balance < diff) {
        throw createValidationError('Requesting facility has insufficient funds to pay the price difference');
      }

      await tx.facility.update({
        where: { id: request.requestingFacilityId },
        data: { balance: { decrement: diff } },
      });

      await tx.balanceTransaction.create({
        data: {
          facilityId: request.requestingFacilityId,
          amount: diff,
          type: 'debit',
          reference: `req_${request.id}`,
          paymentMethod: 'system',
          status: 'success',
          description: `Price adjustment (debit) for broadcast accept: ${request.itemName}`,
        },
      });
    } else if (diff < 0) {
      const refundAmt = Math.abs(diff);
      await tx.facility.update({
        where: { id: request.requestingFacilityId },
        data: { balance: { increment: refundAmt } },
      });

      await tx.balanceTransaction.create({
        data: {
          facilityId: request.requestingFacilityId,
          amount: refundAmt,
          type: 'credit',
          reference: `req_${request.id}`,
          paymentMethod: 'system',
          status: 'success',
          description: `Price adjustment (refund) for broadcast accept: ${request.itemName}`,
        },
      });
    }

    // 2. Perform acceptance update
    updated = await tx.resourceRequest.update({
      where: { id },
      data: {
        supplyingFacilityId,
        handledById,
        status: RequestStatus.ACCEPTED,
        acceptedAt: new Date(),
        pricePerUnit: supplierPrice,
        totalAmount: actualTotalCost,
      },
    });
  });

  await writeAuditLog({
    actorId: handledById,
    action: AuditAction.REQUEST_ACCEPTED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
    newValue: {
      supplyingFacilityId,
      isBroadcastClaim: true,
      reservedThresholdWarning: reservedThresholdWarning || undefined,
    },
  });

  return {
    ...toResourceRequestDTO(updated),
    reservedThresholdWarning,
  };
};

export const declineBroadcast = async (
  id: string,
  facilityId: string
): Promise<void> => {
  const request = await findRequestById(id);
  if (!request) {
    throw createNotFoundError('Broadcast request not found');
  }
  if (!request.isBroadcast) {
    throw createValidationError('Request is not a broadcast');
  }
  await declineBroadcastRequest(id, facilityId);
};

export const expirePendingRequests = async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expiredRequests = await prisma.resourceRequest.findMany({
    where: {
      status: RequestStatus.PENDING,
      requestedAt: { lt: twentyFourHoursAgo },
    },
  });

  for (const req of expiredRequests) {
    await prisma.$transaction(async (tx) => {
      await tx.resourceRequest.update({
        where: { id: req.id },
        data: {
          status: RequestStatus.CANCELLED,
          cancellationReason: 'Auto-cancelled: No supplier accepted within 24 hours',
        },
      });

      await refundRequest(tx, req, '24h Expiration');
    });
  }
};
