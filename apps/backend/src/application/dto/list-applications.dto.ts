import type { z } from 'zod';
import { ListApplicationsQuerySchema } from '@credit-system/shared';

export type ListApplicationsDto = z.infer<typeof ListApplicationsQuerySchema>;
