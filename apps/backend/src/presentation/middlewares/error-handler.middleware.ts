import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Handle known operational errors
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as unknown as { flatten: () => { fieldErrors: Record<string, string[]> } };
    logger.warn('Zod validation error', {
      path: req.path,
      method: req.method,
      errors: zodError.flatten?.() ?? err.message,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: zodError.flatten?.().fieldErrors ?? err.message,
      },
    });
    return;
  }

  // Handle Prisma known request errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string; meta?: Record<string, unknown> };
    logger.warn('Prisma error', {
      code: prismaError.code,
      meta: prismaError.meta,
      path: req.path,
      method: req.method,
    });

    let statusCode = 500;
    let errorCode = 'DATABASE_ERROR';
    let message = 'A database error occurred';

    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        errorCode = 'CONFLICT';
        message = 'A record with this data already exists';
        break;
      case 'P2025':
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        errorCode = 'FOREIGN_KEY_ERROR';
        message = 'Referenced record does not exist';
        break;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn('JWT error', {
      name: err.name,
      message: err.message,
      path: req.path,
      method: req.method,
    });

    const statusCode = err.name === 'TokenExpiredError' ? 401 : 401;
    const message = err.name === 'TokenExpiredError'
      ? 'Token has expired'
      : 'Invalid token';

    res.status(statusCode).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    });
    return;
  }

  // Handle unknown errors - do not leak internal details
  logger.error('Unexpected error', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
