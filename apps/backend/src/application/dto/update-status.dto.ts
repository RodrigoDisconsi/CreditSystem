import type { z } from 'zod';
import { UpdateStatusSchema } from '@credit-system/shared';

export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
