import bcrypt from 'bcrypt';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import {
  writeAuditLog,
  AuditAction,
  UserStatus,
  UserRole,
} from '@medgrid/database';
import {
  createNotFoundError,
  createConflictError,
  createValidationError,
  createAuthorizationError,
  createAuthenticationError,
  type InviteUserDTO,
  type CompleteInvitationDTO,
  type UpdateUserStatusDTO,
  type ElevateDTO,
  type UserDTO,
  type InviteResponseDTO,
  type ElevateResponseDTO,
} from '@medgrid/shared';

import { env } from '../../config/env';
import { findUserByEmail, findUserById } from '../auth/auth.repository';
import {
  findUsersByFacility,
  findAllUsers,
  findUserByIdForManagement,
  createPendingUser,
  completeUserRegistration,
  updateUserStatus,
  createInvitation,
  findPendingInvitationByUser,
  markInvitationUsed,
} from './users.repository';

const BCRYPT_ROUNDS = 12;
const INVITATION_EXPIRES_HOURS = 48;
const ELEVATED_TOKEN_EXPIRES = '30m';

// ===========================================================================
// Token helpers
// ===========================================================================

const signToken = (
  payload: object,
  secret: string,
  expiresIn: string
): string => {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
};

const verifyInvitationToken = (
  token: string
): JwtPayload & { sub: string; type: string } => {
  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw createValidationError('Invalid or expired invitation token');
  }

  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    payload['type'] !== 'invitation'
  ) {
    throw createValidationError('Invalid or expired invitation token');
  }

  return payload as JwtPayload & { sub: string; type: string };
};

// ===========================================================================
// Mappers
// ===========================================================================

const toUserDTO = (
  user: Awaited<ReturnType<typeof findUserByIdForManagement>>
): UserDTO => {
  if (!user) throw createNotFoundError('User not found');

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role as unknown as UserDTO['role'],
    status: user.status as unknown as UserDTO['status'],
    facilityId: user.facilityId,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdById: user.createdById,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};

// ===========================================================================
// Invite
// ===========================================================================

export const inviteUser = async (
  data: InviteUserDTO,
  facilityId: string,
  invitedById: string,
  invitedByRole: string
): Promise<InviteResponseDTO> => {
  // FACILITY_ADMIN can only invite within their own facility
  if (invitedByRole === UserRole.FACILITY_ADMIN) {
    // facilityId comes from the token — already scoped correctly by the gateway
  }

  const email = data.email.trim().toLowerCase();

  const existing = await findUserByEmail(email);

  if (existing && !existing.deletedAt) {
    throw createConflictError('A user with this email already exists');
  }

  const user = await createPendingUser(
    email,
    data.role as unknown as UserRole,
    facilityId,
    invitedById
  );

  // Generate invitation JWT — 48h, type = 'invitation'
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRES_HOURS * 60 * 60 * 1000
  );

  const rawToken = signToken(
    { sub: user.id, type: 'invitation', facilityId },
    env.JWT_ACCESS_SECRET,
    `${INVITATION_EXPIRES_HOURS}h`
  );

  // Store bcrypt hash of the token — never store raw
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);

  await createInvitation(
    user.id,
    facilityId,
    tokenHash,
    expiresAt,
    invitedById
  );

  await writeAuditLog({
    actorId: invitedById,
    actorRole: invitedByRole,
    action: AuditAction.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    facilityId,
    newValue: { email, role: data.role },
  });

  return {
    userId: user.id,
    invitationToken: rawToken,
    expiresAt: expiresAt.toISOString(),
  };
};

// ===========================================================================
// Complete invitation
// ===========================================================================

export const completeInvitation = async (
  data: CompleteInvitationDTO
): Promise<UserDTO> => {
  const payload = verifyInvitationToken(data.invitationToken);

  const user = await findUserById(payload.sub);

  if (!user) {
    throw createValidationError('Invalid or expired invitation token');
  }

  if (user.status !== UserStatus.PENDING_APPROVAL) {
    throw createValidationError('Invitation has already been used');
  }

  const invitation = await findPendingInvitationByUser(user.id);

  if (!invitation) {
    throw createValidationError('Invalid or expired invitation token');
  }

  // JWT verification in verifyInvitationToken() already proves authenticity.
  // The DB record confirms it hasn't been used and hasn't expired.
  // bcrypt.compare is intentionally omitted — JWT tokens exceed bcrypt's 72-byte limit.

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const updated = await completeUserRegistration(
    user.id,
    data.firstName,
    data.lastName,
    passwordHash
  );

  await markInvitationUsed(invitation.id);

  await writeAuditLog({
    actorId: user.id,
    action: AuditAction.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    facilityId: user.facilityId ?? undefined,
    newValue: { status: UserStatus.ACTIVE },
  });

  return toUserDTO(updated);
};

// ===========================================================================
// List & Get
// ===========================================================================

export const listUsers = async (
  facilityId: string | null
): Promise<UserDTO[]> => {
  const users = facilityId
    ? await findUsersByFacility(facilityId)
    : await findAllUsers();

  return users.map(toUserDTO);
};

export const getUserById = async (
  id: string,
  callerFacilityId: string | null
): Promise<UserDTO> => {
  const user = await findUserByIdForManagement(id);

  if (!user) throw createNotFoundError('User not found');

  if (callerFacilityId !== null && user.facilityId !== callerFacilityId) {
    throw createAuthorizationError('Access denied');
  }

  return toUserDTO(user);
};

// ===========================================================================
// Update status
// ===========================================================================

export const setUserStatus = async (
  id: string,
  data: UpdateUserStatusDTO,
  callerId: string,
  callerFacilityId: string | null,
  callerRole: string
): Promise<UserDTO> => {
  if (id === callerId) {
    throw createValidationError('You cannot change your own status');
  }

  const user = await findUserByIdForManagement(id);

  if (!user) throw createNotFoundError('User not found');

  // FACILITY_ADMIN can only manage users in their own facility
  if (
    callerRole === UserRole.FACILITY_ADMIN &&
    user.facilityId !== callerFacilityId
  ) {
    throw createAuthorizationError('Access denied');
  }

  // Nobody can change a SUPER_ADMIN's status
  if (user.role === UserRole.SUPER_ADMIN) {
    throw createAuthorizationError('Cannot modify a SUPER_ADMIN account');
  }

  const updated = await updateUserStatus(
    id,
    data.status as unknown as UserStatus
  );

  const action =
    data.status === 'SUSPENDED'
      ? AuditAction.USER_SUSPENDED
      : AuditAction.USER_DEACTIVATED;

  await writeAuditLog({
    actorId: callerId,
    actorRole: callerRole,
    action,
    entityType: 'User',
    entityId: id,
    facilityId: user.facilityId ?? undefined,
    previousValue: { status: user.status },
    newValue: { status: data.status },
  });

  return toUserDTO(updated);
};

// ===========================================================================
// Elevate (SUPER_ADMIN step-up auth)
// ===========================================================================

export const elevate = async (
  data: ElevateDTO,
  actorId: string
): Promise<ElevateResponseDTO> => {
  const user = await findUserById(actorId);

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    throw createAuthorizationError(
      'Elevation is only available to SUPER_ADMIN'
    );
  }

  const passwordMatches = await bcrypt.compare(
    data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw createAuthenticationError('Invalid password');
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  const elevatedToken = signToken(
    {
      sub: user.id,
      role: user.role,
      elevated: true,
      targetFacilityId: data.targetFacilityId,
    },
    env.JWT_ACCESS_SECRET,
    ELEVATED_TOKEN_EXPIRES
  );

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: AuditAction.LOGIN,
    entityType: 'User',
    entityId: user.id,
    newValue: {
      elevated: true,
      targetFacilityId: data.targetFacilityId,
    },
  });

  return {
    elevatedToken,
    targetFacilityId: data.targetFacilityId,
    expiresAt: expiresAt.toISOString(),
  };
};
