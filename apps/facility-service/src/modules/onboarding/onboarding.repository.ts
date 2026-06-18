import { prisma } from '@medgrid/database';
import { FacilityType, OnboardingRequestStatus } from '@medgrid/database';

import type { SubmitOnboardingRequestDTO } from '@medgrid/shared';

export const createOnboardingRequest = async (
  data: SubmitOnboardingRequestDTO
) => {
  return prisma.facilityOnboardingRequest.create({
    data: {
      facilityName: data.facilityName,
      facilityType: data.facilityType as FacilityType,
      facilityPhone: data.facilityPhone,
      facilityEmail: data.facilityEmail,
      region: data.address.region,
      district: data.address.district,
      addressLine: data.address.addressLine,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      adminFirstName: data.adminFirstName,
      adminLastName: data.adminLastName,
      adminEmail: data.adminEmail,
      adminPhone: data.adminPhone,
    },
  });
};

export const findOnboardingRequestById = async (id: string) => {
  return prisma.facilityOnboardingRequest.findUnique({
    where: { id },
  });
};

export const findOnboardingRequestByAdminEmail = async (adminEmail: string) => {
  return prisma.facilityOnboardingRequest.findUnique({
    where: { adminEmail },
  });
};

export const findAllOnboardingRequests = async (
  status?: OnboardingRequestStatus
) => {
  return prisma.facilityOnboardingRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { submittedAt: 'desc' },
  });
};

export const rejectOnboardingRequest = async (id: string, reason: string) => {
  return prisma.facilityOnboardingRequest.update({
    where: { id },
    data: {
      status: OnboardingRequestStatus.REJECTED,
      rejectionReason: reason,
      reviewedAt: new Date(),
    },
  });
};

export const approveOnboardingRequest = async (
  id: string,
  superAdminId: string,
  passwordHash: string
) => {
  return prisma.$transaction(async (tx) => {
    const request = await tx.facilityOnboardingRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new Error('ONBOARDING_REQUEST_NOT_FOUND');
    }

    if (request.status !== OnboardingRequestStatus.PENDING) {
      throw new Error('ONBOARDING_REQUEST_NOT_PENDING');
    }

    const facility = await tx.facility.create({
      data: {
        name: request.facilityName,
        type: request.facilityType,
        phone: request.facilityPhone,
        email: request.facilityEmail,
        region: request.region,
        district: request.district,
        addressLine: request.addressLine,
        latitude: request.latitude,
        longitude: request.longitude,
      },
    });

    const admin = await tx.user.create({
      data: {
        email: request.adminEmail,
        passwordHash,
        firstName: request.adminFirstName,
        lastName: request.adminLastName,
        phone: request.adminPhone,
        role: 'FACILITY_ADMIN',
        status: 'ACTIVE',
        facilityId: facility.id,
        mustChangePassword: true,
        registeredBySystem: true,
        createdById: superAdminId,
      },
    });

    await tx.facilityOnboardingRequest.update({
      where: { id },
      data: {
        status: OnboardingRequestStatus.APPROVED,
        reviewedAt: new Date(),
      },
    });

    return { facility, admin };
  });
};
