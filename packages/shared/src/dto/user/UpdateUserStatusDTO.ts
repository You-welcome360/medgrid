import { UserStatus } from '../../enums';

export interface UpdateUserStatusDTO {
  status: UserStatus.ACTIVE | UserStatus.SUSPENDED | UserStatus.DEACTIVATED;
}
