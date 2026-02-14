import { z } from 'zod';

export const ListApplicationsDtoSchema = z.object({
  country: z.enum(['BR', 'MX']).optional(),
  status: z.enum(['pending', 'under_review', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListApplicationsDto = z.infer<typeof ListApplicationsDtoSchema>;
