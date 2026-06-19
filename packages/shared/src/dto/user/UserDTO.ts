import { UserRole, UserStatus } from '../../enums';

export interface UserDTO {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  phone: string | null;

  role: UserRole;

  status: UserStatus;

  facilityId: string | null;

  mustChangePassword: boolean;

  lastLoginAt: string | null;

  createdById: string | null;

  createdAt: string;

  updatedAt: string;
}
