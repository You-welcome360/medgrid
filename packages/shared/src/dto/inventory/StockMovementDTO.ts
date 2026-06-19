import { StockMovementType } from '../../enums';

export interface StockMovementDTO {
  id: string;

  inventoryId: string;

  facilityId: string;

  quantity: number;

  movementType: StockMovementType;

  reason: string | null;

  performedById: string;

  referenceId: string | null;

  createdAt: string;
}
