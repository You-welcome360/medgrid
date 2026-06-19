import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

import { writeAuditLog, AuditAction } from '@medgrid/database';
import {
  createNotFoundError,
  createConflictError,
  createValidationError,
  type SubmitOnboardingRequestDTO,
  type OnboardingRequestDTO,
  type ApproveOnboardingResponseDTO,
  OnboardingRequestStatus,
} from '@medgrid/shared';

import {
  createOnboardingRequest,
  findOnboardingRequestById,
  findOnboardingRequestByAdminEmail,
  findAllOnboardingRequests,
  rejectOnboardingRequest,
  approveOnboardingRequest,
} from './onboarding.repository';

const BCRYPT_ROUNDS = 12;

const generateTemporaryPassword = (): string => {
  return crypto.randomBytes(12).toString('base64url');
};

const toOnboardingRequestDTO = (
  request: Awaited<ReturnType<typeof findOnboardingRequestById>>
): OnboardingRequestDTO => {
  if (!request) {
    throw createNotFoundError('Onboarding request not found');
  }

  return {
    id: request.id,
    facilityName: request.facilityName,
    facilityType:
      request.facilityType as string as OnboardingRequestDTO['facilityType'],
    facilityPhone: request.facilityPhone,
    facilityEmail: request.facilityEmail,
    region: request.region,
    district: request.district,
    addressLine: request.addressLine,
    latitude: request.latitude,
    longitude: request.longitude,
    adminFirstName: request.adminFirstName,
    adminLastName: request.adminLastName,
    adminEmail: request.adminEmail,
    adminPhone: request.adminPhone,
    status: request.status,
    rejectionReason: request.rejectionReason,
    submittedAt: request.submittedAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
  };
};

export const submitOnboardingRequest = async (
  data: SubmitOnboardingRequestDTO
): Promise<OnboardingRequestDTO> => {
  const existing = await findOnboardingRequestByAdminEmail(
    data.adminEmail.trim().toLowerCase()
  );

  if (existing) {
    throw createConflictError(
      'An onboarding request with this admin email already exists'
    );
  }

  try {
    const request = await createOnboardingRequest({
      ...data,
      adminEmail: data.adminEmail.trim().toLowerCase(),
    });

    await writeAuditLog({
      action: AuditAction.ONBOARDING_REQUEST_SUBMITTED,
      entityType: 'FacilityOnboardingRequest',
      entityId: request.id,
      newValue: {
        facilityName: request.facilityName,
        adminEmail: request.adminEmail,
      },
    });

    return toOnboardingRequestDTO(request);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw createConflictError(
        'An onboarding request with this admin email already exists'
      );
    }

    throw error;
  }
};

export const getOnboardingRequests = async (
  status?: OnboardingRequestStatus
): Promise<OnboardingRequestDTO[]> => {
  const requests = await findAllOnboardingRequests(status);

  return requests.map(toOnboardingRequestDTO);
};

export const getOnboardingRequestById = async (
  id: string
): Promise<OnboardingRequestDTO> => {
  const request = await findOnboardingRequestById(id);

  if (!request) {
    throw createNotFoundError('Onboarding request not found');
  }

  return toOnboardingRequestDTO(request);
};

export const rejectRequest = async (
  id: string,
  reason: string
): Promise<OnboardingRequestDTO> => {
  const request = await findOnboardingRequestById(id);

  if (!request) {
    throw createNotFoundError('Onboarding request not found');
  }

  if (request.status !== OnboardingRequestStatus.PENDING) {
    throw createValidationError('Only pending requests can be rejected');
  }

  const updated = await rejectOnboardingRequest(id, reason);

  await writeAuditLog({
    actorId: undefined,
    action: AuditAction.ONBOARDING_REQUEST_REJECTED,
    entityType: 'FacilityOnboardingRequest',
    entityId: id,
    newValue: { reason },
  });

  return toOnboardingRequestDTO(updated);
};

export const approveRequest = async (
  id: string,
  superAdminId: string
): Promise<ApproveOnboardingResponseDTO> => {
  const request = await findOnboardingRequestById(id);

  if (!request) {
    throw createNotFoundError('Onboarding request not found');
  }

  if (request.status !== OnboardingRequestStatus.PENDING) {
    throw createConflictError('Only pending requests can be approved');
  }

  const temporaryPassword = generateTemporaryPassword();

  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const { facility, admin } = await approveOnboardingRequest(
    id,
    superAdminId,
    passwordHash
  );

  await writeAuditLog({
    actorId: superAdminId,
    action: AuditAction.ONBOARDING_REQUEST_APPROVED,
    entityType: 'FacilityOnboardingRequest',
    entityId: id,
    newValue: {
      facilityId: facility.id,
      facilityAdminId: admin.id,
    },
  });

  await writeAuditLog({
    actorId: superAdminId,
    action: AuditAction.FACILITY_CREATED,
    entityType: 'Facility',
    entityId: facility.id,
    newValue: { name: facility.name, type: facility.type },
  });

  await writeAuditLog({
    actorId: superAdminId,
    action: AuditAction.USER_CREATED,
    entityType: 'User',
    entityId: admin.id,
    facilityId: facility.id,
    newValue: { email: admin.email, role: admin.role },
  });

  return {
    facilityId: facility.id,
    facilityAdminId: admin.id,
    temporaryPassword,
  };
};
