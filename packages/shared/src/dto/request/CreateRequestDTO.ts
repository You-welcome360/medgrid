import { ResourceType } from '../../enums';

import { PatientInfo } from '../../types';

export interface CreateRequestDTO {
  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  description: string;

  patient?: PatientInfo;
}
