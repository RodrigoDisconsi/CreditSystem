import { z } from 'zod';

export const CreateApplicationDtoSchema = z.object({
  countryCode: z.enum(['BR', 'MX']),
  fullName: z.string().min(2).max(255),
  documentId: z.string().min(1),
  requestedAmount: z.number().positive(),
  monthlyIncome: z.number().positive(),
});

export type CreateApplicationDto = z.infer<typeof CreateApplicationDtoSchema>;
