import { Request, Response, NextFunction } from 'express';
import type { JwtService, JwtPayload } from '../../infrastructure/security/jwt.service.js';
import { UnauthorizedError } from '../../shared/errors/index.js';

// Augment Express Request type with user property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function createAuthMiddleware(jwtService: JwtService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required: no token provided');
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwtService.verify(token);
      req.user = payload;
      next();
    } catch {
      throw new UnauthorizedError('Authentication failed: invalid or expired token');
    }
  };
}
