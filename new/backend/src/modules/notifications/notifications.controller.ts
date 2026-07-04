import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { NotificationsService } from "./notifications.service.js";

export class NotificationsController {
  // GET /notifications
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const isSuperAdmin = req.user.role === "SUPER_ADMIN";
      const userId = req.user.user_id || req.user.id;

      const filters = {
        type: req.query.type?.toString(),
        read: req.query.read === "true"
          ? true
          : req.query.read === "false"
          ? false
          : undefined,
        page: req.query.page ? parseInt(req.query.page.toString()) : 1,
        limit: req.query.limit ? parseInt(req.query.limit.toString()) : 20,
      };

      const result = await NotificationsService.getNotifications(
        userId,
        isSuperAdmin,
        filters
      );

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET /notifications/unread-count
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const userId = req.user.user_id || req.user.id;
      const count = await NotificationsService.getUnreadCount(userId);

      return res.json({ unread_count: count });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // PUT /notifications/mark-all-read
  static async markAllRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const userId = req.user.user_id || req.user.id;
      const updatedCount = await NotificationsService.markAllRead(userId);

      return res.json({
        message: "All notifications marked as read",
        updated_count: updatedCount,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // PUT /notifications/:id/read
  static async markRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ message: "Missing notification ID" });

      const userId = req.user.user_id || req.user.id;
      const isSuperAdmin = req.user.role === "SUPER_ADMIN";

      const notification = await NotificationsService.markRead(
        id,
        userId,
        isSuperAdmin
      );

      return res.json({
        id: notification.id,
        read_at: notification.readAt,
      });
    } catch (error: any) {
      if (error.message === "NOT_FOUND") {
        return res.status(404).json({ message: "Notification not found." });
      }
      if (error.message === "FORBIDDEN") {
        return res.status(403).json({ message: "Forbidden." });
      }
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}
