import { AuthenticatedUserDTO } from './AuthenticatedUserDTO';

export interface LoginResponseDTO {
  accessToken: string;

  user: AuthenticatedUserDTO;
}
