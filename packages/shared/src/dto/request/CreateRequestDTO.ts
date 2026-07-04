import { InventoryUnit, RequestPriority, ResourceType } from '../../enums';

import { PatientInfo } from '../../types';

export interface CreateRequestDTO {
  supplyingFacilityId?: string;

  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  unit: InventoryUnit;

  priority: RequestPriority;

  description: string;

  patient?: PatientInfo;

  isEmergency?: boolean;

  isBroadcast?: boolean;

  maxRadiusKm?: number;

  pricePerUnit?: number;

  expiresAt?: string;
}
