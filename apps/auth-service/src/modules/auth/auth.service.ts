import bcrypt from 'bcrypt';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import {
  createAuthenticationError,
  createValidationError,
  type AuthenticatedUserDTO,
  type ChangePasswordDTO,
  type LoginDTO,
  type LoginResponseDTO,
  UserRole,
} from '@medgrid/shared';
import { UserStatus } from '@medgrid/database';

import { env } from '../../config/env';
import {
  findUserByEmail,
  findUserById,
  recordFailedLoginFailure,
  resetLoginState,
  updatePassword,
} from './auth.repository';

type LoginResult = {
  response: LoginResponseDTO;
  refreshToken: string;
};

type RefreshResult = {
  response: LoginResponseDTO;
};

type AccessTokenPayload = JwtPayload & {
  sub: string;
};

type RefreshTokenPayload = JwtPayload & {
  sub: string;
};

const createToken = (payload: object, secret: string, expiresIn: string) => {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
};

const getLockUntilDate = () => {
  return new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000);
};

const toAuthenticatedUser = (
  user: Awaited<ReturnType<typeof findUserByEmail>>
): AuthenticatedUserDTO => {
  if (!user) {
    throw createAuthenticationError('Invalid email or password');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    facilityId: user.facilityId,
    mustChangePassword: user.mustChangePassword,
  };
};

const ensureActiveUser = (
  user: Awaited<ReturnType<typeof findUserByEmail>>
) => {
  if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
    throw createAuthenticationError('Authentication required');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw createAuthenticationError('Account is temporarily locked');
  }

  return user;
};

const verifyAccessToken = (
  authorizationHeader: string | undefined
): AccessTokenPayload => {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw createAuthenticationError('Authentication required');
  }

  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw createAuthenticationError('Authentication required');
  }

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw createAuthenticationError('Authentication required');
  }

  return payload as AccessTokenPayload;
};

const verifyRefreshToken = (
  refreshToken: string | undefined
): RefreshTokenPayload => {
  if (!refreshToken) {
    throw createAuthenticationError('Authentication required');
  }

  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw createAuthenticationError('Authentication required');
  }

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw createAuthenticationError('Authentication required');
  }

  return payload as RefreshTokenPayload;
};

export const login = async (data: LoginDTO): Promise<LoginResult> => {
  const email = data.email.trim().toLowerCase();

  const user = await findUserByEmail(email);

  if (!user) {
    throw createAuthenticationError('Invalid email or password');
  }

  if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
    throw createAuthenticationError('Invalid email or password');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw createAuthenticationError('Account is temporarily locked');
  }

  const passwordMatches = await bcrypt.compare(
    data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;

    const lockedUntil =
      failedLoginAttempts >= env.LOGIN_MAX_FAILED_ATTEMPTS
        ? getLockUntilDate()
        : null;

    await recordFailedLoginFailure(user.id, failedLoginAttempts, lockedUntil);

    if (lockedUntil) {
      throw createAuthenticationError('Account is temporarily locked');
    }

    throw createAuthenticationError('Invalid email or password');
  }

  await resetLoginState(user.id);

  const tokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    facilityId: user.facilityId,
  };

  const accessToken = createToken(
    tokenPayload,
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = createToken(
    {
      sub: user.id,
    },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN
  );

  return {
    response: {
      accessToken,
      user: toAuthenticatedUser(user),
    },
    refreshToken,
  };
};

export const refreshSession = async (
  refreshToken: string | undefined
): Promise<RefreshResult> => {
  const payload = verifyRefreshToken(refreshToken);

  const user = ensureActiveUser(await findUserById(payload.sub));

  const accessToken = createToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRES_IN
  );

  return {
    response: {
      accessToken,
      user: toAuthenticatedUser(user),
    },
  };
};

export const getCurrentUser = async (
  authorizationHeader: string | undefined,
  refreshToken?: string
): Promise<AuthenticatedUserDTO> => {
  const payload = authorizationHeader
    ? verifyAccessToken(authorizationHeader)
    : verifyRefreshToken(refreshToken);

  const user = ensureActiveUser(await findUserById(payload.sub));

  return toAuthenticatedUser(user);
};

export const changePassword = async (
  authorizationHeader: string | undefined,
  data: ChangePasswordDTO
): Promise<void> => {
  const payload = verifyAccessToken(authorizationHeader);

  const user = ensureActiveUser(await findUserById(payload.sub));

  const passwordMatches = await bcrypt.compare(
    data.currentPassword,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw createValidationError('Current password is incorrect');
  }

  const isSamePassword = await bcrypt.compare(
    data.newPassword,
    user.passwordHash
  );

  if (isSamePassword) {
    throw createValidationError(
      'New password must be different from current password'
    );
  }

  const BCRYPT_ROUNDS = 12;

  const newPasswordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);

  await updatePassword(user.id, newPasswordHash);
};
