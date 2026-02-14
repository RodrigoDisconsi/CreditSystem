import { AppError } from './app-error.js';

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}
