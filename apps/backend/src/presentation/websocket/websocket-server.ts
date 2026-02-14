import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import type { JwtService } from '../../infrastructure/security/jwt.service.js';
import { logger } from '../../shared/logger.js';

export class WebSocketServer implements IWebSocketEmitter {
  private io: SocketIOServer;

  constructor(httpServer: HttpServer, jwtService: JwtService, corsOrigin: string) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: corsOrigin, credentials: true },
    });

    // Auth middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      try {
        const payload = jwtService.verify(token);
        (socket as any).user = payload;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      const user = (socket as any).user;
      logger.info('WebSocket client connected', { userId: user?.userId, socketId: socket.id });

      socket.on('subscribe:country', (country: string) => {
        if (['BR', 'MX'].includes(country)) {
          socket.join(`country:${country}`);
          logger.debug('Client subscribed to country', { country, socketId: socket.id });
        }
      });

      socket.on('subscribe:application', (appId: string) => {
        socket.join(`application:${appId}`);
        logger.debug('Client subscribed to application', { applicationId: appId, socketId: socket.id });
      });

      socket.on('unsubscribe:country', (country: string) => {
        socket.leave(`country:${country}`);
        logger.debug('Client unsubscribed from country', { country, socketId: socket.id });
      });

      socket.on('unsubscribe:application', (appId: string) => {
        socket.leave(`application:${appId}`);
        logger.debug('Client unsubscribed from application', { applicationId: appId, socketId: socket.id });
      });

      socket.on('disconnect', (reason) => {
        logger.info('WebSocket client disconnected', { userId: user?.userId, socketId: socket.id, reason });
      });
    });
  }

  emitToCountry(countryCode: string, event: string, data: unknown): void {
    this.io.to(`country:${countryCode}`).emit(event, data);
  }

  emitToApplication(applicationId: string, event: string, data: unknown): void {
    this.io.to(`application:${applicationId}`).emit(event, data);
  }
}
