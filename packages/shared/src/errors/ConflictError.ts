import { AppError } from './AppError';

export const createConflictError = (
  message = 'Resource conflict'
): AppError => ({
  name: 'ConflictError',
  message,
  statusCode: 409,
  isOperational: true,
});
