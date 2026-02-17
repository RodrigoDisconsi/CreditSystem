import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { healthRoutes } from './routes/health.routes.js';
import { env } from '../config/env.js';

export function createApp(): Express {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }));

  // Parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(compression());

  // Request tracking
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Health routes (no auth required)
  app.use(healthRoutes);

  return app;
}

// Attach error handler AFTER routes are mounted
export function attachErrorHandler(app: Express): void {
  app.use(errorHandler);
}
