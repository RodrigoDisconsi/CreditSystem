import { Router } from 'express';
import { z } from 'zod';
import { CreateApplicationSchema, UpdateStatusSchema, ListApplicationsQuerySchema } from '@credit-system/shared';
import type { ApplicationController } from '../controllers/application.controller.js';
import { validate } from '../middlewares/validation.middleware.js';

const UuidParamsSchema = z.object({
  id: z.string().uuid(),
});

export interface ApplicationRouteDeps {
  applicationController: ApplicationController;
  authMiddleware: ReturnType<typeof import('../middlewares/auth.middleware.js').createAuthMiddleware>;
  authorizeMiddleware: typeof import('../middlewares/authorize.middleware.js').authorize;
}

export function createApplicationRoutes(deps: ApplicationRouteDeps): Router {
  const { applicationController, authMiddleware, authorizeMiddleware } = deps;
  const router = Router();

  // POST /api/v1/applications - Create application (authenticated)
  router.post(
    '/api/v1/applications',
    authMiddleware,
    validate(CreateApplicationSchema, 'body'),
    applicationController.create,
  );

  // GET /api/v1/applications - List applications (authenticated)
  router.get(
    '/api/v1/applications',
    authMiddleware,
    validate(ListApplicationsQuerySchema, 'query'),
    applicationController.list,
  );

  // GET /api/v1/applications/:id - Get application by ID (authenticated)
  router.get(
    '/api/v1/applications/:id',
    authMiddleware,
    validate(UuidParamsSchema, 'params'),
    applicationController.getById,
  );

  // PATCH /api/v1/applications/:id/status - Update status (admin or analyst only)
  router.patch(
    '/api/v1/applications/:id/status',
    authMiddleware,
    authorizeMiddleware('admin', 'analyst'),
    validate(UuidParamsSchema, 'params'),
    validate(UpdateStatusSchema, 'body'),
    applicationController.updateStatus,
  );

  return router;
}
