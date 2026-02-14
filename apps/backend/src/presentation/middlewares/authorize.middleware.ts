import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/index.js';

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied: role '${req.user.role}' is not authorized. Required roles: ${roles.join(', ')}`,
      );
    }

    next();
  };
}
