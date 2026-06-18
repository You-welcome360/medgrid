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

export const env = {
  PORT: Number(process.env.GATEWAY_PORT) || Number(process.env.PORT) || 4000,

  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;
