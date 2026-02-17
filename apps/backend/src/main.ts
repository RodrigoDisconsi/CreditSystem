import { env } from './config/env.js';

import { createServer } from 'http';
import Redis from 'ioredis';
import { Container } from './container.js';
import { createApp, attachErrorHandler } from './presentation/app.js';
import { WebSocketServer } from './presentation/websocket/websocket-server.js';
import { createAuthMiddleware } from './presentation/middlewares/auth.middleware.js';
import { createApplicationRoutes } from './presentation/routes/application.routes.js';
import { createWebhookRoutes } from './presentation/routes/webhook.routes.js';
import { createAuthRoutes } from './presentation/routes/auth.routes.js';
import { authorize } from './presentation/middlewares/authorize.middleware.js';
import { createRateLimitMiddleware, RATE_LIMITS } from './presentation/middlewares/rate-limit.middleware.js';
import { setupBullBoard } from './infrastructure/queue/bull-board.js';
import { WS_REDIS_CHANNEL, type WsRedisMessage } from './infrastructure/websocket/redis-websocket-emitter.js';
import { autoSeedIfEmpty } from './startup/auto-seed.js';

async function main() {
  // Initialize DI container
  const container = new Container({
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwtSecret: env.JWT_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    corsOrigin: env.CORS_ORIGIN,
  });

  // Create Express app
  const app = createApp();

  // Rate limiting
  const authRateLimit = createRateLimitMiddleware(container.redis, RATE_LIMITS.auth);
  const apiRateLimit = createRateLimitMiddleware(container.redis, RATE_LIMITS.api);
  const webhookRateLimit = createRateLimitMiddleware(container.redis, RATE_LIMITS.webhooks);

  // Auth routes (no auth middleware needed, rate limited)
  app.use('/auth', authRateLimit);
  app.use(createAuthRoutes(container.jwtService));

  // Auth middleware for protected routes
  const authMiddleware = createAuthMiddleware(container.jwtService);

  // Application routes (rate limited)
  app.use('/api', apiRateLimit);
  app.use(createApplicationRoutes({
    applicationController: container.applicationController,
    authMiddleware,
    authorizeMiddleware: authorize,
  }));

  // Webhook routes (rate limited + HMAC auth)
  app.use('/api/v1/webhooks', webhookRateLimit);
  app.use(createWebhookRoutes({
    webhookController: container.webhookController,
    webhookSecret: env.JWT_SECRET, // reuse JWT secret as webhook HMAC key for MVP
  }));

  // Bull Board dashboard (dev only, behind auth)
  if (env.NODE_ENV === 'development') {
    setupBullBoard(app, container.queueService);
  }

  // Auto-seed database if empty (development convenience)
  await autoSeedIfEmpty(container.prisma, container.encryptionService);

  // Error handler (must be last)
  attachErrorHandler(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Attach WebSocket
  const wsServer = new WebSocketServer(httpServer, container.jwtService, env.CORS_ORIGIN);
  container.setWebSocketEmitter(wsServer);

  // Subscribe to Redis pub/sub for worker WebSocket events
  const redisSub = new Redis(env.REDIS_URL);
  redisSub.subscribe(WS_REDIS_CHANNEL);
  redisSub.on('message', (_channel: string, message: string) => {
    try {
      const msg: WsRedisMessage = JSON.parse(message);
      if (msg.target === 'country') {
        wsServer.emitToCountry(msg.id, msg.event, msg.data);
      } else if (msg.target === 'application') {
        wsServer.emitToApplication(msg.id, msg.event, msg.data);
      }
    } catch {
      // Ignore malformed messages
    }
  });

  // Start listening
  httpServer.listen(env.PORT, () => {
    console.log(`Backend server running on port ${env.PORT}`);
    console.log(`WebSocket server attached`);
    if (env.NODE_ENV === 'development') {
      console.log(`Bull Board: http://localhost:${env.PORT}/admin/queues`);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    httpServer.close();
    redisSub.disconnect();
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
