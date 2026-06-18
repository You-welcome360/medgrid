import './env';

export const services = {
  facilityService: process.env.FACILITY_SERVICE_URL ?? 'http://localhost:4001',

  coordinationService:
    process.env.COORDINATION_SERVICE_URL ?? 'http://localhost:4002',

  authService: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4003',
} as const;
