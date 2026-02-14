import { z } from 'zod';

export const WebhookNotificationDtoSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(['pending', 'under_review', 'approved', 'rejected']),
  data: z.record(z.unknown()),
});

export type WebhookNotificationDto = z.infer<typeof WebhookNotificationDtoSchema>;
