import { AppError } from './AppError';

export const createAuthorizationError = (
  message = 'Access denied'
): AppError => ({
  name: 'AuthorizationError',
  message,
  statusCode: 403,
  isOperational: true,
});
