import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import type { JwtService, JwtPayload } from '../../infrastructure/security/jwt.service.js';
import { UnauthorizedError } from '../../shared/errors/index.js';

interface MvpUser {
  userId: string;
  email: string;
  password: string;
  role: string;
}

const MVP_USERS: MvpUser[] = [
  { userId: randomUUID(), email: 'admin@credit.com', password: 'admin123', role: 'admin' },
  { userId: randomUUID(), email: 'analyst@credit.com', password: 'analyst123', role: 'analyst' },
  { userId: randomUUID(), email: 'viewer@credit.com', password: 'viewer123', role: 'viewer' },
];

export function createAuthRoutes(jwtService: JwtService): Router {
  const router = Router();

  router.post('/auth/login', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new UnauthorizedError('Email and password are required');
      }

      const user = MVP_USERS.find((u) => u.email === email && u.password === password);

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const payload: JwtPayload = {
        userId: user.userId,
        email: user.email,
        role: user.role,
      };

      const token = jwtService.sign(payload);
      const refreshToken = jwtService.signRefresh(payload);

      res.json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            userId: user.userId,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/refresh', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }

      let payload: JwtPayload;
      try {
        payload = jwtService.verify(refreshToken);
      } catch {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const newPayload: JwtPayload = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      const token = jwtService.sign(newPayload);
      const newRefreshToken = jwtService.signRefresh(newPayload);

      res.json({
        success: true,
        data: {
          token,
          refreshToken: newRefreshToken,
          user: {
            userId: newPayload.userId,
            email: newPayload.email,
            role: newPayload.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
