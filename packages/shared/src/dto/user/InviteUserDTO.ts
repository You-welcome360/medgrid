import { AssignableUserRole } from '../../enums';

export interface InviteUserDTO {
  email: string;

  role: AssignableUserRole;
}
