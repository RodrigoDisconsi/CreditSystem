import { z } from 'zod';

export const CreateApplicationSchema = z.object({
  countryCode: z.enum(['BR', 'MX']),
  fullName: z.string().min(2).max(255),
  documentId: z.string().min(1),
  requestedAmount: z.number().positive(),
  monthlyIncome: z.number().positive(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'under_review', 'approved', 'rejected']),
});

export const ListApplicationsQuerySchema = z.object({
  country: z.enum(['BR', 'MX']).optional(),
  status: z.enum(['pending', 'under_review', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuerySchema>;
