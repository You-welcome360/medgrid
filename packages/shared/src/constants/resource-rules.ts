import { FacilityType, ResourceType } from '../enums';

export const FACILITY_RESOURCE_ACCESS: Record<FacilityType, ResourceType[]> = {
  [FacilityType.HOSPITAL]: [
    ResourceType.BLOOD,
    ResourceType.PPE,
    ResourceType.MEDICATION,
    ResourceType.MEDICAL_EQUIPMENT,
  ],
  [FacilityType.BLOOD_BANK]: [ResourceType.BLOOD],
  [FacilityType.PHARMACY]: [ResourceType.MEDICATION],
  [FacilityType.PPE_SUPPLIER]: [ResourceType.PPE, ResourceType.MEDICAL_EQUIPMENT],
};
