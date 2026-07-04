import { prisma, Prisma } from '@medgrid/database';
import { NotificationType, NotificationChannel } from '@medgrid/shared';
import { sendMail } from './mailer';
import {
  requestCreatedEmail,
  requestAcknowledgedEmail,
  requestFulfilledEmail,
  requestCanceledEmail,
  requestExpiredEmail,
  balanceLowEmail,
  balanceTopupEmail,
} from './emailTemplates';

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

// Relays socket events to the API gateway
async function broadcastSocketEvent(event: string, room: string, data: any): Promise<void> {
  const gatewayUrl = process.env.GATEWAY_INTERNAL_URL || 'http://localhost:4000';
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'super_secret';
  try {
    const response = await fetch(`${gatewayUrl}/api/v1/internal/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ event, room, data }),
    });
    if (!response.ok) {
      console.error(`[NotificationService] Gateway socket relay failed: ${response.statusText}`);
    }
  } catch (err: any) {
    console.error(`[NotificationService] Gateway socket relay error: ${err.message}`);
  }
}

// Delivers a notification to a specific user based on preferences
async function deliverToUser(
  userId: string,
  facilityId: string,
  payload: NotifyPayload,
  emailPayload: EmailPayload | null,
  isEmergency: boolean
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      notificationPreferences: true,
    },
  });

  if (!user) return;

  const prefMap = new Map(
    user.notificationPreferences.map((p) => [p.channel, p])
  );

  const getPref = (channel: NotificationChannel) => {
    const p = prefMap.get(channel);
    if (!p) return { enabled: true, emergencyOnly: false }; // default: enabled
    return { enabled: p.enabled, emergencyOnly: p.emergencyOnly };
  };

  // --- WebSocket ---
  const wsPref = getPref(NotificationChannel.WEBSOCKET);
  if (wsPref.enabled && (!wsPref.emergencyOnly || isEmergency)) {
    await prisma.notification.create({
      data: {
        userId,
        facilityId,
        type: payload.type,
        channel: NotificationChannel.WEBSOCKET,
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        deliveredAt: new Date(),
      },
    });
  }

  // --- Push ---
  const pushPref = getPref(NotificationChannel.PUSH);
  if (pushPref.enabled && (!pushPref.emergencyOnly || isEmergency) && isEmergency) {
    await prisma.notification.create({
      data: {
        userId,
        facilityId,
        type: payload.type,
        channel: NotificationChannel.PUSH,
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        deliveredAt: new Date(),
      },
    });
  }

  // --- Email ---
  const emailPref = getPref(NotificationChannel.EMAIL);
  if (emailPref.enabled && (!emailPref.emergencyOnly || isEmergency) && emailPayload) {
    await prisma.notification.create({
      data: {
        userId,
        facilityId,
        type: payload.type,
        channel: NotificationChannel.EMAIL,
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        deliveredAt: new Date(),
      },
    });
    await sendMail({ to: user.email, ...emailPayload });
  }
}

// Delivers a notification to all active users in a facility
async function notifyFacility(
  facilityId: string,
  payload: NotifyPayload,
  emailPayload: EmailPayload | null,
  isEmergency: boolean
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { facilityId, status: 'ACTIVE' },
    select: { id: true },
  });

  await Promise.all(
    users.map((u) =>
      deliverToUser(u.id, facilityId, payload, emailPayload, isEmergency).catch(
        (err) => console.error('[Notify] deliverToUser failed:', err.message)
      )
    )
  );

  const socketEvent = payload.type.toLowerCase().replace(/_/g, ':');
  await broadcastSocketEvent(socketEvent, `facility:${facilityId}`, {
    ...payload.data,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    facilityId,
  });
}

// Public notification triggers
export async function notifyRequestCreated(requestId: string): Promise<void> {
  try {
    const req = await prisma.resourceRequest.findUnique({
      where: { id: requestId },
      include: {
        requestingFacility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const isEmergency = req.isEmergency;
    const title = isEmergency
      ? `🚨 Emergency Request: ${req.itemName}`
      : `New Request: ${req.itemName}`;
    const body = `${req.requestingFacility.name} requests ${req.quantity} ${req.unit.toLowerCase()}(s) of ${req.itemName}`;

    const payload: NotifyPayload = {
      type: NotificationType.REQUEST_CREATED,
      title,
      body,
      data: { request_id: req.id, classification: isEmergency ? 'emergency' : 'normal' },
      facilityId: req.requestingFacilityId,
    };

    const emailTpl = requestCreatedEmail({
      facilityName: req.requestingFacility.name,
      resourceName: req.itemName,
      quantity: req.quantity,
      classification: isEmergency ? 'emergency' : 'normal',
      urgencyLevel: req.priority,
      status: req.status,
    });

    await notifyFacility(req.requestingFacilityId, payload, emailTpl, isEmergency);
    await broadcastSocketEvent('request:created', 'super_admin', { request_id: req.id, ...payload.data });
  } catch (err: any) {
    console.error('[Notify] notifyRequestCreated failed:', err.message);
  }
}

export async function notifyRequestAcknowledged(requestId: string): Promise<void> {
  try {
    const req = await prisma.resourceRequest.findUnique({
      where: { id: requestId },
      include: {
        supplyingFacility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const ackName = req.supplyingFacility?.name ?? 'A facility';
    const title = `Request Acknowledged`;
    const body = `${ackName} has acknowledged your request for ${req.itemName}`;

    const payload: NotifyPayload = {
      type: NotificationType.REQUEST_ACKNOWLEDGED,
      title,
      body,
      data: {
        request_id: req.id,
        acknowledged_by: req.supplyingFacilityId,
        acknowledged_by_name: ackName,
      },
      facilityId: req.requestingFacilityId,
    };

    const emailTpl = requestAcknowledgedEmail({
      resourceName: req.itemName,
      acknowledgedByName: ackName,
      acknowledgedAt: req.acceptedAt ?? new Date(),
    });

    await notifyFacility(req.requestingFacilityId, payload, emailTpl, true);
    await broadcastSocketEvent('request:acknowledged', 'super_admin', { request_id: req.id });
  } catch (err: any) {
    console.error('[Notify] notifyRequestAcknowledged failed:', err.message);
  }
}

export async function notifyRequestFulfilled(requestId: string): Promise<void> {
  try {
    const req = await prisma.resourceRequest.findUnique({
      where: { id: requestId },
      include: {
        supplyingFacility: { select: { id: true, name: true } },
      },
    });
    if (!req) return;

    const fulfilledByName = req.supplyingFacility?.name ?? 'A facility';
    const title = `Request Fulfilled`;
    const body = `Your request for ${req.itemName} has been fulfilled by ${fulfilledByName}`;

    const payload: NotifyPayload = {
      type: NotificationType.REQUEST_FULFILLED,
      title,
      body,
      data: { request_id: req.id, fulfilled_by: req.supplyingFacilityId },
      facilityId: req.requestingFacilityId,
    };

    const emailTpl = requestFulfilledEmail({
      resourceName: req.itemName,
      quantity: req.quantity,
      fulfilledByName,
      totalAmount: Number(req.totalAmount ?? 0),
      fulfilledAt: req.completedAt ?? new Date(),
    });

    await notifyFacility(req.requestingFacilityId, payload, emailTpl, true);
    await broadcastSocketEvent('request:fulfilled', 'super_admin', { request_id: req.id });
  } catch (err: any) {
    console.error('[Notify] notifyRequestFulfilled failed:', err.message);
  }
}

export async function notifyRequestCanceled(
  requestId: string,
  refundAmount: number
): Promise<void> {
  try {
    const req = await prisma.resourceRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) return;

    const title = `Request Canceled`;
    const body = `Your request for ${req.itemName} has been canceled`;

    const payload: NotifyPayload = {
      type: NotificationType.REQUEST_CANCELED,
      title,
      body,
      data: { request_id: req.id, refund_amount: refundAmount },
      facilityId: req.requestingFacilityId,
    };

    const emailTpl = requestCanceledEmail({
      resourceName: req.itemName,
      refundAmount,
    });

    await notifyFacility(req.requestingFacilityId, payload, emailTpl, true);
    await broadcastSocketEvent('request:canceled', 'super_admin', { request_id: req.id });
  } catch (err: any) {
    console.error('[Notify] notifyRequestCanceled failed:', err.message);
  }
}

export async function notifyRequestExpired(requestId: string): Promise<void> {
  try {
    const req = await prisma.resourceRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) return;

    const title = `Request Expired`;
    const body = `Your emergency request for ${req.itemName} has expired`;

    const payload: NotifyPayload = {
      type: NotificationType.REQUEST_EXPIRED,
      title,
      body,
      data: { request_id: req.id },
      facilityId: req.requestingFacilityId,
    };

    const emailTpl = requestExpiredEmail({
      resourceName: req.itemName,
      quantity: req.quantity,
    });

    await notifyFacility(req.requestingFacilityId, payload, emailTpl, true);
    await broadcastSocketEvent('request:expired', 'super_admin', { request_id: req.id });
  } catch (err: any) {
    console.error('[Notify] notifyRequestExpired failed:', err.message);
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

    const threshold = Number(process.env.BALANCE_LOW_THRESHOLD) || 100;
    const title = `Low Balance Alert`;
    const body = `Balance for ${facility.name} is ₵${currentBalance.toFixed(2)} — below the ₵${threshold} threshold`;

    const payload: NotifyPayload = {
      type: NotificationType.BALANCE_LOW,
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
    console.error('[Notify] notifyBalanceLow failed:', err.message);
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
      type: NotificationType.BALANCE_TOPUP,
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
    console.error('[Notify] notifyBalanceTopup failed:', err.message);
  }
}
