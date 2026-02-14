import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger.js';

const SENSITIVE_PATHS = ['/auth'];

function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATHS.some((p) => path.startsWith(p));
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData: Record<string, unknown> = {
      method: req.method,
      url: isSensitivePath(req.path) ? `${req.path} [REDACTED]` : req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
