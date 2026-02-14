import { AppError } from './app-error.js';

export class UnauthorizedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}
