import { prisma } from "../../config/prisma.js";
import { PaystackService } from "../../utils/paystack.js";
import { Prisma } from "@prisma/client";
import {
  notifyBalanceTopup,
  notifyBalanceLow,
} from "../../services/notification.service.js";
import { env } from "../../config/env.js";

export class FacilityService {
  static async getProfile(facilityId: string) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: {
        id: true,
        name: true,
        location: true,
        type: true,
        phone: true,
        latitude: true,
        longitude: true,
        balance: true,
        createdAt: true,
      },
    });

    if (!facility) throw new Error("FACILITY_NOT_FOUND");

    return {
      id: facility.id,
      name: facility.name,
      location: facility.location,
      type: facility.type,
      phone: facility.phone,
      latitude: facility.latitude,
      longitude: facility.longitude,
      balance: Number(facility.balance),
      created_at: facility.createdAt,
    };
  }

  static async updateProfile(
    facilityId: string,
    data: {
      location?: string;
      phone?: string;
      latitude?: number | null;
      longitude?: number | null;
    }
  ) {
    const facility = await prisma.facility.update({
      where: { id: facilityId },
      data: {
        ...(data.location !== undefined && { location: data.location }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
      },
      select: {
        id: true,
        name: true,
        location: true,
        type: true,
        phone: true,
        latitude: true,
        longitude: true,
        balance: true,
        createdAt: true,
      },
    });

    return {
      id: facility.id,
      name: facility.name,
      location: facility.location,
      type: facility.type,
      phone: facility.phone,
      latitude: facility.latitude,
      longitude: facility.longitude,
      balance: Number(facility.balance),
      created_at: facility.createdAt,
    };
  }

  static async getBalance(facilityId: string) {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true, balance: true },
    });

    if (!facility) {
      throw new Error("FACILITY_NOT_FOUND");
    }

    return {
      facility_id: facility.id,
      facility_name: facility.name,
      balance: Number(facility.balance),
    };
  }

  static async initializeTopUp(
    facilityId: string,
    email: string,
    amount: number,
    callbackUrl: string
  ) {
    if (amount <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    // 1. Fetch facility to confirm existence
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      throw new Error("FACILITY_NOT_FOUND");
    }

    // 2. Initialize Paystack transaction
    const paystackResult = await PaystackService.initializeTransaction(
      email,
      amount,
      callbackUrl
    );

    // 3. Create a pending transaction record
    const transaction = await prisma.balanceTransaction.create({
      data: {
        facilityId,
        amount: new Prisma.Decimal(amount),
        type: "topup",
        reference: paystackResult.reference,
        paymentMethod: "paystack",
        status: "pending",
        description: "Balance top-up",
      },
    });

    return {
      transaction_id: transaction.id,
      amount,
      payment_url: paystackResult.authorization_url,
      reference: paystackResult.reference,
    };
  }

  static async getBalanceHistory(
    facilityId: string,
    isSuperAdmin: boolean,
    filters: {
      type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!isSuperAdmin) {
      where.facilityId = facilityId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.start_date || filters.end_date) {
      where.createdAt = {};
      if (filters.start_date) {
        where.createdAt.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        where.createdAt.lte = new Date(filters.end_date);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.balanceTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        reference: t.reference,
        payment_method: t.paymentMethod,
        status: t.status,
        description: t.description,
        created_at: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  static async processPaystackWebhook(reference: string, status: string) {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.balanceTransaction.findFirst({
        where: { reference },
      });

      if (!transaction) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }

      if (transaction.status !== "pending") {
        return { status: "already_processed", facilityId: null, amount: null, newBalance: null };
      }

      if (status === "success") {
        await tx.balanceTransaction.update({
          where: { id: transaction.id },
          data: { status: "completed" },
        });

        const updated = await tx.facility.update({
          where: { id: transaction.facilityId },
          data: { balance: { increment: transaction.amount } },
        });

        return {
          status: "completed",
          facilityId: transaction.facilityId,
          amount: Number(transaction.amount),
          newBalance: Number(updated.balance),
        };
      } else {
        await tx.balanceTransaction.update({
          where: { id: transaction.id },
          data: { status: "failed" },
        });

        return { status: "failed", facilityId: null, amount: null, newBalance: null };
      }
    }, { maxWait: 15000, timeout: 30000 });

    // Fire notifications AFTER transaction has committed
    if (result.status === "completed" && result.facilityId && result.newBalance !== null) {
      notifyBalanceTopup(result.facilityId, result.amount!, result.newBalance).catch(() => {});

      if (result.newBalance < env.BALANCE_LOW_THRESHOLD) {
        notifyBalanceLow(result.facilityId, result.newBalance).catch(() => {});
      }
    }

    return { status: result.status };
  }
}
