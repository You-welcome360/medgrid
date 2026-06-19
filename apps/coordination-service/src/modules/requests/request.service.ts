import { writeAuditLog, AuditAction } from '@medgrid/database';
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
} from './request.repository';
import {
  lookupInventoryItem,
  recordInternalStockMovement,
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

  const request = await createResourceRequest(
    data,
    requestingFacilityId,
    requestedById
  );

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

  return toResourceRequestDTO(request);
};

export const getRequests = async (
  facilityId: string | null,
  status?: RequestStatus
): Promise<ResourceRequestDTO[]> => {
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
): Promise<ResourceRequestDTO> => {
  const request = await findRequestById(id);

  assertStatus(
    request,
    [RequestStatus.PENDING],
    'Only pending requests can be accepted'
  );
  assertSupplier(request, supplyingFacilityId);

  const updated = await acceptRequest(id, handledById);

  await writeAuditLog({
    actorId: handledById,
    action: AuditAction.REQUEST_ACCEPTED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
  });

  return toResourceRequestDTO(updated);
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
    [RequestStatus.PENDING],
    'Only pending requests can be rejected'
  );
  assertSupplier(request, supplyingFacilityId);

  const updated = await rejectRequest(id, handledById, data.reason);

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
    action: AuditAction.REQUEST_ACCEPTED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
    newValue: { dispatchedAt: updated.dispatchedAt?.toISOString() },
  });

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

  // Fire stock movements best-effort — do not block completion if inventory
  // items don't exist (e.g. supplier hasn't registered the item yet)
  if (request!.supplyingFacilityId) {
    const supplierItem = await lookupInventoryItem(
      request!.supplyingFacilityId,
      request!.itemName,
      request!.resourceType
    );

    if (supplierItem) {
      await recordInternalStockMovement(
        supplierItem.inventoryId,
        request!.supplyingFacilityId,
        -request!.quantity, // negative = stock out
        'TRANSFER_OUT',
        `Fulfilled resource request ${id}`,
        request!.handledById ?? confirmedById,
        id
      );
    }
  }

  const requesterItem = await lookupInventoryItem(
    requestingFacilityId,
    request!.itemName,
    request!.resourceType
  );

  if (requesterItem) {
    await recordInternalStockMovement(
      requesterItem.inventoryId,
      requestingFacilityId,
      request!.quantity, // positive = stock in
      'TRANSFER_IN',
      `Received resource request ${id}`,
      confirmedById,
      id
    );
  }

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

  const updated = await cancelRequest(id, data.reason);

  await writeAuditLog({
    actorId: cancelledById,
    action: AuditAction.REQUEST_CANCELLED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: requestingFacilityId,
    newValue: { reason: data.reason },
  });

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
    action: AuditAction.REQUEST_CANCELLED,
    entityType: 'ResourceRequest',
    entityId: id,
    facilityId: supplyingFacilityId,
  });

  return toResourceRequestDTO(updated);
};
