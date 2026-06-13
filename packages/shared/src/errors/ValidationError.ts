import { AppError } from './AppError';

export const createValidationError = (
  message = 'Validation failed'
): AppError => ({
  name: 'ValidationError',
  message,
  statusCode: 400,
  isOperational: true,
});
