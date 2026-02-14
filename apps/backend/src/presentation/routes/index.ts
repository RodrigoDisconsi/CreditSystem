import { Router } from 'express';
import type { JwtService } from '../../infrastructure/security/jwt.service.js';
import type { ApplicationController } from '../controllers/application.controller.js';
import type { WebhookController } from '../controllers/webhook.controller.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { createAuthRoutes } from './auth.routes.js';
import { createApplicationRoutes } from './application.routes.js';
import { createWebhookRoutes } from './webhook.routes.js';

export interface RouteDeps {
  jwtService: JwtService;
  applicationController: ApplicationController;
  webhookController: WebhookController;
}

export function createRoutes(deps: RouteDeps): Router {
  const { jwtService, applicationController, webhookController } = deps;
  const router = Router();

  const authMiddleware = createAuthMiddleware(jwtService);

  // Auth routes (no auth required)
  router.use(createAuthRoutes(jwtService));

  // Application routes (auth required)
  router.use(createApplicationRoutes({
    applicationController,
    authMiddleware,
    authorizeMiddleware: authorize,
  }));

  // Webhook routes (no auth, but validated)
  router.use(createWebhookRoutes({
    webhookController,
  }));

  return router;
}
