import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Container } from './container.js';
import { createApp, attachErrorHandler } from './presentation/app.js';
import { WebSocketServer } from './presentation/websocket/websocket-server.js';
import { createAuthMiddleware } from './presentation/middlewares/auth.middleware.js';
import { createApplicationRoutes } from './presentation/routes/application.routes.js';
import { createWebhookRoutes } from './presentation/routes/webhook.routes.js';
import { createAuthRoutes } from './presentation/routes/auth.routes.js';
import { authorize } from './presentation/middlewares/authorize.middleware.js';
import { setupBullBoard } from './infrastructure/queue/bull-board.js';

async function main() {
  const port = process.env.PORT || 3000;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  // Initialize DI container
  const container = new Container({
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    corsOrigin,
  });

  // Create Express app
  const app = createApp();

  // Auth routes (no auth middleware needed)
  app.use(createAuthRoutes(container.jwtService));

  // Auth middleware for protected routes
  const authMiddleware = createAuthMiddleware(container.jwtService);

  // Application routes
  app.use(createApplicationRoutes({
    applicationController: container.applicationController,
    authMiddleware,
    authorizeMiddleware: authorize,
  }));

  // Webhook routes
  app.use(createWebhookRoutes({
    webhookController: container.webhookController,
  }));

  // Bull Board dashboard (dev only)
  if (process.env.NODE_ENV === 'development') {
    setupBullBoard(app, container.queueService);
  }

  // Error handler (must be last)
  attachErrorHandler(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Attach WebSocket
  const wsServer = new WebSocketServer(httpServer, container.jwtService, corsOrigin);
  container.setWebSocketEmitter(wsServer);

  // Start listening
  httpServer.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    console.log(`WebSocket server attached`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`Bull Board: http://localhost:${port}/admin/queues`);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    httpServer.close();
    await container.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
