import { UserRole } from '../../enums';

export interface AuthenticatedUserDTO {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  role: UserRole;

  facilityId: string | null;

  mustChangePassword: boolean;
}
