import { StockMovementType } from '../../enums';

export interface CreateStockMovementDTO {
  quantity: number;

  movementType: StockMovementType;

  reason?: string;

  referenceId?: string;
}
