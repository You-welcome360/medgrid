import { z } from 'zod';

import { VALIDATION } from '../../constants';

export const CompleteInvitationSchema = z.object({
  firstName: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH),

  lastName: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH),

  password: z
    .string()
    .min(VALIDATION.PASSWORD.MIN_LENGTH)
    .max(VALIDATION.PASSWORD.MAX_LENGTH)
    .regex(
      VALIDATION.PASSWORD.REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});
