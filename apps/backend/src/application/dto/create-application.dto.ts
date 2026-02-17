import type { z } from 'zod';
import { CreateApplicationSchema } from '@credit-system/shared';

export type CreateApplicationDto = z.infer<typeof CreateApplicationSchema>;
