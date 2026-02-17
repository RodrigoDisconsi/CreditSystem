import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookController } from '../controllers/webhook.controller.js';
import { validate } from '../middlewares/validation.middleware.js';
import { UnauthorizedError } from '../../shared/errors/index.js';

const BankNotificationSchema = z.object({
  applicationId: z.string().uuid(),
  provider: z.enum(['SERASA', 'BURO_CREDITO']),
  status: z.enum(['success', 'error']),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

function verifyWebhookSignature(secret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const signature = req.headers['x-webhook-signature'] as string | undefined;

    // In development, allow requests without signature for easy testing
    if (process.env.NODE_ENV === 'development' && !signature) {
      next();
      return;
    }

    if (!signature) {
      throw new UnauthorizedError('Missing webhook signature (x-webhook-signature header)');
    }

    const payload = JSON.stringify(req.body);
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new UnauthorizedError('Invalid webhook signature');
    }

    next();
  };
}

export interface WebhookRouteDeps {
  webhookController: WebhookController;
  webhookSecret: string;
}

export function createWebhookRoutes(deps: WebhookRouteDeps): Router {
  const { webhookController, webhookSecret } = deps;
  const router = Router();

  // POST /api/v1/webhooks/bank-notification - Receive bank notification (authenticated + validated body)
  router.post(
    '/api/v1/webhooks/bank-notification',
    verifyWebhookSignature(webhookSecret),
    validate(BankNotificationSchema, 'body'),
    webhookController.handleBankNotification,
  );

  return router;
}
