import type { NextFunction, Request, Response } from 'express';
import { prisma, NotificationType, NotificationChannel } from '@medgrid/database';
import { UpdateNotificationPreferencesSchema, createValidationError, type ApiResponse } from '@medgrid/shared';

export const listNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const userId = user.id;
    const page = parseInt(req.query['page'] as string || '1', 10);
    const limit = parseInt(req.query['limit'] as string || '20', 10);
    const type = req.query['type'] as string;
    const read = req.query['read'] as string;

    const where: any = { userId, channel: NotificationChannel.WEBSOCKET };
    if (type && Object.values(NotificationType).includes(type as NotificationType)) {
      where.type = type as NotificationType;
    }
    if (read === 'true') {
      where.readAt = { not: null };
    } else if (read === 'false') {
      where.readAt = null;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: notifications.map((n: any) => ({
          id: n.id,
          userId: n.userId,
          facilityId: n.facilityId,
          type: n.type,
          channel: n.channel,
          title: n.title,
          body: n.body,
          data: n.data,
          readAt: n.readAt?.toISOString() ?? null,
          deliveredAt: n.deliveredAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        pagination: { total, page, limit },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const markReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const userId = user.id;
    const id = req.params['id'] as string;

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    const response: ApiResponse<any> = {
      success: true,
      message: 'Notification marked as read',
      data: updated,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const markAllReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const userId = user.id;

    await prisma.notification.updateMany({
      where: { userId, readAt: null, channel: NotificationChannel.WEBSOCKET },
      data: { readAt: new Date() },
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'All notifications marked as read',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getPreferencesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const userId = user.id;

    const dbPrefs = await prisma.userNotificationPreference.findMany({
      where: { userId },
    });

    const prefMap = new Map(dbPrefs.map((p: any) => [p.channel, p]));
    const getChan = (channel: NotificationChannel) => {
      const p = prefMap.get(channel) as any;
      return {
        enabled: p ? p.enabled : true,
        emergencyOnly: p ? p.emergencyOnly : false,
      };
    };

    const data = {
      websocket: { enabled: true, emergencyOnly: false },
      push: getChan(NotificationChannel.PUSH),
      email: getChan(NotificationChannel.EMAIL),
    };

    const response: ApiResponse<typeof data> = {
      success: true,
      message: 'Notification preferences retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const updatePreferencesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const userId = user.id;

    const result = UpdateNotificationPreferencesSchema.safeParse(req.body);
    if (!result.success) {
      return next(createValidationError());
    }

    const { push, email } = result.data;

    await prisma.$transaction(async (txClient: any) => {
      if (push) {
        await txClient.userNotificationPreference.upsert({
          where: { userId_channel: { userId, channel: NotificationChannel.PUSH } },
          update: { enabled: push.enabled, emergencyOnly: push.emergencyOnly },
          create: { userId, channel: NotificationChannel.PUSH, enabled: push.enabled, emergencyOnly: push.emergencyOnly },
        });
      }
      if (email) {
        await txClient.userNotificationPreference.upsert({
          where: { userId_channel: { userId, channel: NotificationChannel.EMAIL } },
          update: { enabled: email.enabled, emergencyOnly: email.emergencyOnly },
          create: { userId, channel: NotificationChannel.EMAIL, enabled: email.enabled, emergencyOnly: email.emergencyOnly },
        });
      }
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Notification preferences updated successfully',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
