import { prisma } from '@medgrid/database';
import { UserRole, UserStatus } from '@medgrid/database';

// ===========================================================================
// Users
// ===========================================================================

export const findUsersByFacility = async (facilityId: string) => {
  return prisma.user.findMany({
    where: { facilityId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
};

export const findAllUsers = async () => {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
};

export const findUserByIdForManagement = async (id: string) => {
  return prisma.user.findUnique({
    where: { id, deletedAt: null },
  });
};

export const createPendingUser = async (
  email: string,
  role: UserRole,
  facilityId: string | null,
  createdById: string
) => {
  return prisma.user.create({
    data: {
      email,
      passwordHash: '', // set on invitation completion
      firstName: '', // set on invitation completion
      lastName: '', // set on invitation completion
      role,
      status: UserStatus.PENDING_APPROVAL,
      facilityId,
      createdById,
    },
  });
};

export const completeUserRegistration = async (
  userId: string,
  firstName: string,
  lastName: string,
  passwordHash: string
) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      passwordHash,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  });
};

export const updateUserStatus = async (userId: string, status: UserStatus) => {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
  });
};

// ===========================================================================
// Invitations
// ===========================================================================

export const createInvitation = async (
  userId: string,
  facilityId: string | null,
  tokenHash: string,
  expiresAt: Date,
  createdById: string
) => {
  return prisma.userInvitation.create({
    data: {
      userId,
      facilityId,
      tokenHash,
      expiresAt,
      createdById,
    },
  });
};

export const findPendingInvitationByUser = async (userId: string) => {
  return prisma.userInvitation.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
};

export const markInvitationUsed = async (id: string) => {
  return prisma.userInvitation.update({
    where: { id },
    data: { usedAt: new Date() },
  });
};
