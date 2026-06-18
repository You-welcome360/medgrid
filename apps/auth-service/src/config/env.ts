import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  quiet: true,
});

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
  quiet: true,
});

const requiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
};

const numberEnv = (key: string, fallback: number) => {
  const value = Number(process.env[key]);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT:
    Number(process.env.AUTH_SERVICE_PORT) || Number(process.env.PORT) || 4003,
  JWT_ACCESS_SECRET: requiredEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requiredEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  LOGIN_MAX_FAILED_ATTEMPTS: numberEnv('LOGIN_MAX_FAILED_ATTEMPTS', 5),
  LOGIN_LOCK_MINUTES: numberEnv('LOGIN_LOCK_MINUTES', 15),
} as const;
