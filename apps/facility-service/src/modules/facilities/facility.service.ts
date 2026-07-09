import { createNotFoundError, type UpdateFacilityDTO } from '@medgrid/shared';
import type { Facility } from '@medgrid/database/src/generated/prisma/client';
import { prisma } from '@medgrid/database';
import { PaystackService } from '../../utils/paystack';
import { notifyBalanceTopup, notifyBalanceLow } from '@medgrid/notifications';

import {
  findAllFacilities,
  findFacilityById,
  updateFacility as dbUpdateFacility,
} from './facility.repository';

const toFacilityDTO = (facility: Facility) => ({
  id: facility.id,
  name: facility.name,
  type: facility.type,
  status: facility.status,
  phone: facility.phone,
  email: facility.email,
  region: facility.region,
  district: facility.district,
  addressLine: facility.addressLine,
  latitude: facility.latitude,
  longitude: facility.longitude,
  balance: facility.balance ? Number(facility.balance) : 0.00,
  createdAt: facility.createdAt.toISOString(),
  updatedAt: facility.updatedAt.toISOString(),
});

export const getAllFacilities = async () => {
  const facilities = await findAllFacilities();
  return facilities.map(toFacilityDTO);
};

export const getFacilityById = async (id: string) => {
  const facility = await findFacilityById(id);

  if (!facility) {
    throw createNotFoundError('Facility not found');
  }

  return toFacilityDTO(facility);
};

export const verifyPendingTransactions = async (facilityId: string) => {
  const pendingTransactions = await prisma.balanceTransaction.findMany({
    where: {
      facilityId,
      status: 'pending',
      paymentMethod: 'paystack',
    },
  });

  for (const tx of pendingTransactions) {
    if (!tx.reference) continue;
    try {
      const result = await PaystackService.verifyTransaction(tx.reference);
      if (result.status === 'success') {
        await prisma.$transaction(async (txClient) => {
          const freshTx = await txClient.balanceTransaction.findUnique({
            where: { id: tx.id },
          });
          if (freshTx && freshTx.status === 'pending') {
            await txClient.balanceTransaction.update({
              where: { id: tx.id },
              data: { status: 'success' },
            });

            const updatedFacility = await txClient.facility.update({
              where: { id: facilityId },
              data: { balance: { increment: tx.amount } },
            });

            notifyBalanceTopup(facilityId, Number(tx.amount), Number(updatedFacility.balance ?? 0)).catch((err) =>
              console.error('[Verification] Topup notify failed:', err.message)
            );
          }
        });
      } else if (result.status === 'failed') {
        await prisma.balanceTransaction.update({
          where: { id: tx.id },
          data: { status: 'failed' },
        });
      }
    } catch (error: any) {
      console.error(`[Verification] Error verifying transaction ${tx.reference}:`, error.message);
    }
  }
};

export const getFacilityBalance = async (facilityId: string) => {
  await verifyPendingTransactions(facilityId).catch((err) =>
    console.error('[Verification] verifyPendingTransactions failed:', err.message)
  );

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { id: true, balance: true },
  });

  if (!facility) {
    throw createNotFoundError('Facility not found');
  }

  return {
    facilityId: facility.id,
    balance: Number(facility.balance),
  };
};

export const initializeTopUp = async (
  facilityId: string,
  email: string,
  amount: number,
  callbackUrl: string
) => {
  if (amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
  });

  if (!facility) {
    throw createNotFoundError('Facility not found');
  }

  const paystack = await PaystackService.initializeTransaction(email, amount, callbackUrl);

  await prisma.balanceTransaction.create({
    data: {
      facilityId,
      amount,
      type: 'credit',
      reference: paystack.reference,
      paymentMethod: 'paystack',
      status: 'pending',
      description: `Balance top-up of ₵${amount.toFixed(2)}`,
    },
  });

  return {
    payment_url: paystack.authorization_url,
    reference: paystack.reference,
  };
};

export const getBalanceHistory = async (
  facilityId: string,
  filters: { page: number; limit: number; type?: string }
) => {
  const page = Math.max(1, filters.page);
  const limit = Math.max(1, filters.limit);
  const type = filters.type;

  const where: any = { facilityId };
  if (type) {
    where.type = type;
  }

  const [transactions, total] = await Promise.all([
    prisma.balanceTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.balanceTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      reference: t.reference,
      paymentMethod: t.paymentMethod,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    pagination: {
      total,
      page,
      limit,
    },
  };
};

export const processPaystackWebhook = async (reference: string, status: string) => {
  const tx = await prisma.balanceTransaction.findFirst({
    where: { reference },
  });

  if (!tx) {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  if (tx.status !== 'pending') {
    return { status: 'already_processed' };
  }

  if (status === 'success') {
    await prisma.$transaction(async (txClient) => {
      await txClient.balanceTransaction.update({
        where: { id: tx.id },
        data: { status: 'success' },
      });

      const updatedFacility = await txClient.facility.update({
        where: { id: tx.facilityId },
        data: { balance: { increment: tx.amount } },
      });

      // Send topup notification asynchronously
      notifyBalanceTopup(tx.facilityId, Number(tx.amount), Number(updatedFacility.balance)).catch((err) =>
        console.error('[Webhook] Topup notify failed:', err.message)
      );

      // Check balance threshold
      const lowThreshold = Number(process.env.BALANCE_LOW_THRESHOLD) || 100;
      if (Number(updatedFacility.balance) < lowThreshold) {
        notifyBalanceLow(tx.facilityId, Number(updatedFacility.balance)).catch((err) =>
          console.error('[Webhook] Low balance notify failed:', err.message)
        );
      }
    });

    return { status: 'success' };
  } else {
    await prisma.balanceTransaction.update({
      where: { id: tx.id },
      data: { status: 'failed' },
    });
    return { status: 'failed' };
  }
};

// Legacy stub — kept to avoid breaking the existing route
export const createFacility = async () => {
  return { facilityId: 'facility-123' };
};

export const updateFacility = async (id: string, dto: UpdateFacilityDTO) => {
  await getFacilityById(id); // throws if not exists

  const updateInput: any = {};
  if (dto.facilityName) updateInput.name = dto.facilityName;
  if (dto.phone) updateInput.phone = dto.phone;
  if (dto.email) updateInput.email = dto.email;

  if (dto.address) {
    if (dto.address.region) updateInput.region = dto.address.region;
    if (dto.address.district) updateInput.district = dto.address.district;
    if (dto.address.addressLine !== undefined) updateInput.addressLine = dto.address.addressLine;
  }

  if (dto.location) {
    if (dto.location.latitude !== undefined) updateInput.latitude = dto.location.latitude;
    if (dto.location.longitude !== undefined) updateInput.longitude = dto.location.longitude;
  }

  const updated = await dbUpdateFacility(id, updateInput);
  return toFacilityDTO(updated);
};


