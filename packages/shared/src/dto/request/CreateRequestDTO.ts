import { RequestPriority, ResourceType } from '../../enums';

import { PatientInfo } from '../../types';

export interface CreateRequestDTO {
  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  priority: RequestPriority;

  description: string;

  patient?: PatientInfo;
}
