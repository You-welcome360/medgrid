import {
  BloodGroup,
  InventoryStatus,
  InventoryUnit,
  ResourceType,
} from '../enums';

import { ISODateString, UUID } from './Common';

export interface BloodMetadata {
  bloodGroup: BloodGroup;

  collectionDate: ISODateString;

  expiryDate: ISODateString;
}

export interface MedicationMetadata {
  batchNumber: string;

  manufacturer: string;

  expiryDate: ISODateString;
}

export interface PPEMetadata {
  batchNumber?: string;

  manufacturer?: string;

  expiryDate?: ISODateString;
}

export interface EquipmentMetadata {
  serialNumber: string;

  manufacturer: string;

  maintenanceDueDate?: ISODateString;
}

export type InventoryMetadata =
  | BloodMetadata
  | MedicationMetadata
  | PPEMetadata
  | EquipmentMetadata;

// InventoryBatch represents a batch of inventory items in the system. It contains information about the resource type,
// item name, quantity, unit, status, and metadata associated with the batch. The metadata can vary based on the type of inventory (e.g., blood, medication, PPE, equipment).
export interface InventoryBatch {
  id: UUID;

  facilityId: UUID;

  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  unit: InventoryUnit;

  status: InventoryStatus;

  metadata: InventoryMetadata;

  createdAt: ISODateString;

  updatedAt: ISODateString;
}
