import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../shared/errors/index.js';

type ValidationSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        result.error.flatten().fieldErrors,
      );
    }
    req[source] = result.data;
    next();
  };
}
