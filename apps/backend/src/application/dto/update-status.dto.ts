import { z } from 'zod';

export const UpdateStatusDtoSchema = z.object({
  status: z.enum(['pending', 'under_review', 'approved', 'rejected']),
});

export type UpdateStatusDto = z.infer<typeof UpdateStatusDtoSchema>;
