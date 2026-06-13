export interface AppError {
  name: string;

  message: string;

  statusCode: number;

  isOperational: boolean;

  details?: unknown;
}
