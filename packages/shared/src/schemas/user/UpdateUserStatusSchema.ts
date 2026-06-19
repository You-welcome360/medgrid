import { z } from 'zod';

import { UserStatus } from '../../enums';

export const UpdateUserStatusSchema = z.object({
  status: z.enum([
    UserStatus.ACTIVE,
    UserStatus.SUSPENDED,
    UserStatus.DEACTIVATED,
  ]),
});
