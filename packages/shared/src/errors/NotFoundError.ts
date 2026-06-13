import { AppError } from './AppError';

export const createNotFoundError = (
  message = 'Resource not found'
): AppError => ({
  name: 'NotFoundError',
  message,
  statusCode: 404,
  isOperational: true,
});
