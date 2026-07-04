import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export class NotificationsService {
  static async getNotifications(
    userId: string,
    isSuperAdmin: boolean,
    filters: {
      type?: string;
      read?: boolean;
      page: number;
      limit: number;
    }
  ) {
    const skip = (filters.page - 1) * filters.limit;

    const where: Prisma.NotificationWhereInput = {};

    if (!isSuperAdmin) {
      where.userId = userId;
    }

    if (filters.type) {
      where.type = filters.type.toUpperCase() as any;
    }

    if (filters.read === true) {
      where.readAt = { not: null };
    } else if (filters.read === false) {
      where.readAt = null;
    }

    // De-duplicate: show only one record per (type, data.request_id) per channel
    // by returning distinct on (type + requestId), preferring WEBSOCKET channel
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          channel: true,
          title: true,
          body: true,
          data: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...where, userId, readAt: null },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        title: n.title,
        body: n.body,
        data: n.data,
        read_at: n.readAt,
        created_at: n.createdAt,
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
      },
      unread_count: unreadCount,
    };
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  static async markRead(
    id: string,
    userId: string,
    isSuperAdmin: boolean
  ) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) throw new Error("NOT_FOUND");
    if (!isSuperAdmin && notification.userId !== userId) {
      throw new Error("FORBIDDEN");
    }

    if (notification.readAt) {
      // Already read — return as-is
      return notification;
    }

    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  static async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }
}
