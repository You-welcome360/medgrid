import { z } from 'zod';

const PreferenceChannelSchema = z.object({
  enabled: z.boolean(),
  emergencyOnly: z.boolean(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  push: PreferenceChannelSchema.optional(),
  email: PreferenceChannelSchema.optional(),
});
