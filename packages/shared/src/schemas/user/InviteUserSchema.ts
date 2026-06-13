import { z } from 'zod';

import { AssignableUserRole } from '../../enums';
import { VALIDATION } from '../../constants';

export const InviteUserSchema = z.object({
  email: z.email().max(VALIDATION.EMAIL.MAX_LENGTH),

  role: z.enum(AssignableUserRole),
});
