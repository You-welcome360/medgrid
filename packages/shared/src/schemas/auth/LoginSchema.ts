import { z } from 'zod';

import { VALIDATION } from '../../constants';

export const LoginSchema = z.object({
  email: z.email().max(VALIDATION.EMAIL.MAX_LENGTH),

  password: z
    .string()
    .min(VALIDATION.PASSWORD.MIN_LENGTH)
    .max(VALIDATION.PASSWORD.MAX_LENGTH),
});
