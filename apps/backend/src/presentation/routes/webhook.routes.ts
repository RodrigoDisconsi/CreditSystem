import { Router } from 'express';
import { z } from 'zod';
import type { WebhookController } from '../controllers/webhook.controller.js';
import { validate } from '../middlewares/validation.middleware.js';

const BankNotificationSchema = z.object({
  applicationId: z.string().uuid(),
  provider: z.enum(['SERASA', 'BURO_CREDITO']),
  status: z.enum(['success', 'error']),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export interface WebhookRouteDeps {
  webhookController: WebhookController;
}

export function createWebhookRoutes(deps: WebhookRouteDeps): Router {
  const { webhookController } = deps;
  const router = Router();

  // POST /api/v1/webhooks/bank-notification - Receive bank notification (validated body)
  router.post(
    '/api/v1/webhooks/bank-notification',
    validate(BankNotificationSchema, 'body'),
    webhookController.handleBankNotification,
  );

  return router;
}
