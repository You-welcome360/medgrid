import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { NotificationsController } from "./notifications.controller.js";

const router = Router();

// Order matters: specific paths before /:id
router.get("/unread-count", authMiddleware, NotificationsController.getUnreadCount);
router.put("/mark-all-read", authMiddleware, NotificationsController.markAllRead);
router.get("/", authMiddleware, NotificationsController.getNotifications);
router.put("/:id/read", authMiddleware, NotificationsController.markRead);

export default router;
