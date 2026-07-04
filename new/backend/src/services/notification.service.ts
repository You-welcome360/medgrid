import { NotificationChannel, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { sendMail } from "../config/mailer.js";
import { emitToFacility, emitToSuperAdmins } from "../config/socket.js";
import { env } from "../config/env.js";
import {
  requestCreatedEmail,
  requestAcknowledgedEmail,
  requestFulfilledEmail,
  requestCanceledEmail,
  requestExpiredEmail,
  balanceLowEmail,
  balanceTopupEmail,
} from "../utils/emailTemplates.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NotifyPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  facilityId: string;
}

interface EmailPayload {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Core: persist + deliver one notification for a single user
// ---------------------------------------------------------------------------
async function deliverToUser(
  userId: string,
  facilityId: string,
  payload: NotifyPayload,
  emailPayload: EmailPayload | null,
  isEmergency: boolean
): Promise<void> {
  // Fetch user with preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      notificationPreferences: true,
    },
  });

  if (!user) return;

  // Helper to check channel preference
  const prefMap = new Map(
    user.notificationPreferences.map((p) => [p.channel, p])
  );

  const getPref = (channel: NotificationChannel) => {
    const p = prefMap.get(channel);
    if (!p) return { enabled: true, emergencyOnly: false }; // default on
    return { enabled: p.enabled, emergencyOnly: p.emergencyOnly };
  };

  // --- WebSocket ---
  const wsPref = getPref("WEBSOCKET");
  if (wsPref.enabled && (!wsPref.emergencyOnly || isEmergency)) {
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        facilityId,
        type: payload.type,
        channel: "WEBSOCKET",
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        deliveredAt: new Date(),
      },
    });
    // WebSocket emission handled at the facility level (below)
  }

  // --- In-app Push (only for emergency or explicit push triggers) ---
  const pushPref = getPref("PUSH");
  const shouldPush =
    pushPref.enabled &&
    (!pushPref.emergencyOnly || isEmergency) &&
    isEmergency; // per spec: push only for emergency creation + all status changes

  if (shouldPush) {
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        facilityId,
        type: payload.type,
        channel: "PUSH",
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        deliveredAt: new Date(),
      },
    });
  }

  // --- Email ---
  const emailPref = getPref("EMAIL");
  if (
    emailPref.enabled &&
    (!emailPref.emergencyOnly || isEmergency) &&
    emailPayload
  ) {
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        facilityId,
        type: payload.type,
        channel: "EMAIL",
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        deliveredAt: new Date(),
      },
    });
    await sendMail({ to: user.email, ...emailPayload });
  }
}

// ---------------------------------------------------------------------------
// Notify all users in a facility
// ---------------------------------------------------------------------------
async function notifyFacility(
  facilityId: string,
  payload: NotifyPayload,
  emailPayload: EmailPayload | null,
  isEmergency: boolean
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { facilityId, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    users.map((u) =>
      deliverToUser(u.id, facilityId, payload, emailPayload, isEmergency).catch(
        (err) => console.error("[Notify] deliverToUser failed:", err.message)
      )
    )
  );

  // Emit WebSocket event to the room (one emit covers all connected clients)
  const socketEvent = payload.type.toLowerCase().replace(/_/g, ":");
  emitToFacility(facilityId, socketEvent, {
    ...payload.data,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    facilityId,
  });
}

// ---------------------------------------------------------------------------
// Public notification triggers
// ---------------------------------------------------------------------------

export async function notifyRequestCreated(requestId: string): Promise<void> {
  try {
    const req = await prisma.coordinationRequest.findUnique({
      where: { id: requestId },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const isEmergency = req.classification === "emergency";
    const title = isEmergency
      ? `🚨 Emergency Request: ${req.resourceType.name}`
      : `New Request: ${req.resourceType.name}`;
    const body = `${req.facility.name} requests ${req.quantity} unit(s) of ${req.resourceType.name}`;

    const payload: NotifyPayload = {
      type: "REQUEST_CREATED",
      title,
      body,
      data: { request_id: req.id, classification: req.classification },
      facilityId: req.facilityId,
    };

    const emailTpl = requestCreatedEmail({
      facilityName: req.facility.name,
      resourceName: req.resourceType.name,
      quantity: req.quantity,
      classification: req.classification,
      urgencyLevel: req.urgencyLevel,
      status: req.status,
    });

    // Notify requesting facility
    await notifyFacility(req.facilityId, payload, emailTpl, isEmergency);

    // Also emit to super admins
    emitToSuperAdmins("request:created", { request_id: req.id, ...payload.data });
  } catch (err: any) {
    console.error("[Notify] notifyRequestCreated:", err.message);
  }
}

export async function notifyRequestAcknowledged(requestId: string): Promise<void> {
  try {
    const req = await prisma.coordinationRequest.findUnique({
      where: { id: requestId },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
        acknowledgingFacility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const ackName = req.acknowledgingFacility?.name ?? "A facility";
    const title = `Request Acknowledged`;
    const body = `${ackName} has acknowledged your request for ${req.resourceType.name}`;

    const payload: NotifyPayload = {
      type: "REQUEST_ACKNOWLEDGED",
      title,
      body,
      data: {
        request_id: req.id,
        acknowledged_by: req.acknowledgedBy,
        acknowledged_by_name: ackName,
      },
      facilityId: req.facilityId,
    };

    const emailTpl = requestAcknowledgedEmail({
      resourceName: req.resourceType.name,
      acknowledgedByName: ackName,
      acknowledgedAt: req.acknowledgedAt ?? new Date(),
    });

    await notifyFacility(req.facilityId, payload, emailTpl, true);
    emitToSuperAdmins("request:acknowledged", { request_id: req.id });
  } catch (err: any) {
    console.error("[Notify] notifyRequestAcknowledged:", err.message);
  }
}

export async function notifyRequestFulfilled(requestId: string): Promise<void> {
  try {
    const req = await prisma.coordinationRequest.findUnique({
      where: { id: requestId },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
        fulfillmentFacility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const fulfilledByName = req.fulfillmentFacility?.name ?? "A facility";
    const title = `Request Fulfilled`;
    const body = `Your request for ${req.resourceType.name} has been fulfilled by ${fulfilledByName}`;

    const payload: NotifyPayload = {
      type: "REQUEST_FULFILLED",
      title,
      body,
      data: { request_id: req.id, fulfilled_by: req.fulfilledBy },
      facilityId: req.facilityId,
    };

    const emailTpl = requestFulfilledEmail({
      resourceName: req.resourceType.name,
      quantity: req.quantity,
      fulfilledByName,
      totalAmount: Number(req.totalAmount ?? 0),
      fulfilledAt: req.fulfilledAt ?? new Date(),
    });

    await notifyFacility(req.facilityId, payload, emailTpl, true);
    emitToSuperAdmins("request:fulfilled", { request_id: req.id });
  } catch (err: any) {
    console.error("[Notify] notifyRequestFulfilled:", err.message);
  }
}

export async function notifyRequestCanceled(
  requestId: string,
  refundAmount: number
): Promise<void> {
  try {
    const req = await prisma.coordinationRequest.findUnique({
      where: { id: requestId },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const title = `Request Canceled`;
    const body = `Your request for ${req.resourceType.name} has been canceled`;

    const payload: NotifyPayload = {
      type: "REQUEST_CANCELED",
      title,
      body,
      data: { request_id: req.id, refund_amount: refundAmount },
      facilityId: req.facilityId,
    };

    const emailTpl = requestCanceledEmail({
      resourceName: req.resourceType.name,
      refundAmount,
    });

    await notifyFacility(req.facilityId, payload, emailTpl, true);
    emitToSuperAdmins("request:canceled", { request_id: req.id });
  } catch (err: any) {
    console.error("[Notify] notifyRequestCanceled:", err.message);
  }
}

export async function notifyRequestExpired(requestId: string): Promise<void> {
  try {
    const req = await prisma.coordinationRequest.findUnique({
      where: { id: requestId },
      include: {
        resourceType: true,
        facility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const title = `Request Expired`;
    const body = `Your emergency request for ${req.resourceType.name} has expired`;

    const payload: NotifyPayload = {
      type: "REQUEST_EXPIRED",
      title,
      body,
      data: { request_id: req.id },
      facilityId: req.facilityId,
    };

    const emailTpl = requestExpiredEmail({
      resourceName: req.resourceType.name,
      quantity: req.quantity,
    });

    await notifyFacility(req.facilityId, payload, emailTpl, true);
    emitToSuperAdmins("request:expired", { request_id: req.id });
  } catch (err: any) {
    console.error("[Notify] notifyRequestExpired:", err.message);
  }
}

export async function notifyBalanceLow(
  facilityId: string,
  currentBalance: number
): Promise<void> {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { name: true },
    });
    if (!facility) return;

    const threshold = env.BALANCE_LOW_THRESHOLD;
    const title = `Low Balance Alert`;
    const body = `Balance for ${facility.name} is ₵${currentBalance.toFixed(2)} — below the ₵${threshold} threshold`;

    const payload: NotifyPayload = {
      type: "BALANCE_LOW",
      title,
      body,
      data: { facility_id: facilityId, current_balance: currentBalance, threshold },
      facilityId,
    };

    const emailTpl = balanceLowEmail({
      facilityName: facility.name,
      currentBalance,
      threshold,
    });

    await notifyFacility(facilityId, payload, emailTpl, false);
  } catch (err: any) {
    console.error("[Notify] notifyBalanceLow:", err.message);
  }
}

export async function notifyBalanceTopup(
  facilityId: string,
  amount: number,
  newBalance: number
): Promise<void> {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { name: true },
    });
    if (!facility) return;

    const title = `Balance Top-Up Confirmed`;
    const body = `₵${amount.toFixed(2)} added to ${facility.name}. New balance: ₵${newBalance.toFixed(2)}`;

    const payload: NotifyPayload = {
      type: "BALANCE_TOPUP",
      title,
      body,
      data: { facility_id: facilityId, amount, new_balance: newBalance },
      facilityId,
    };

    const emailTpl = balanceTopupEmail({
      facilityName: facility.name,
      amount,
      newBalance,
    });

    await notifyFacility(facilityId, payload, emailTpl, false);
  } catch (err: any) {
    console.error("[Notify] notifyBalanceTopup:", err.message);
  }
}
