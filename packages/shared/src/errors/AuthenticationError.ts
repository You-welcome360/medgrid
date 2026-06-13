import { AppError } from './AppError';

export const createAuthenticationError = (
  message = 'Authentication required'
): AppError => ({
  name: 'AuthenticationError',
  message,
  statusCode: 401,
  isOperational: true,
});
