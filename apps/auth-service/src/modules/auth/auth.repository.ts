import { prisma } from '@medgrid/database';

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
};

export const recordFailedLoginFailure = async (
  userId: string,
  failedLoginAttempts: number,
  lockedUntil: Date | null
) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      failedLoginAttempts,
      lockedUntil,
    },
  });
};

export const resetLoginState = async (userId: string) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
};

export const updatePassword = async (userId: string, passwordHash: string) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
};
