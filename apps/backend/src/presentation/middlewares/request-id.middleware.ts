import { Request, Response, NextFunction } from 'express';
import { requestContext, createRequestContext } from '../../shared/request-context.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const context = createRequestContext();
  res.setHeader('X-Request-ID', context.requestId);

  requestContext.run(context, () => {
    next();
  });
}
