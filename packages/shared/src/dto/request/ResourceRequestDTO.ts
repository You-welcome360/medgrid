import {
  InventoryUnit,
  RequestPriority,
  RequestStatus,
  ResourceType,
} from '../../enums';

import { PatientInfo } from '../../types';

export interface ResourceRequestDTO {
  id: string;

  requestingFacilityId: string;

  supplyingFacilityId: string | null;

  requestedById: string;

  handledById: string | null;

  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  unit: InventoryUnit;

  priority: RequestPriority;

  status: RequestStatus;

  description: string;

  patient: PatientInfo | null;

  rejectionReason: string | null;

  cancellationReason: string | null;

  requestedAt: string;

  acceptedAt: string | null;

  dispatchedAt: string | null;

  completedAt: string | null;

  createdAt: string;

  updatedAt: string;
}
