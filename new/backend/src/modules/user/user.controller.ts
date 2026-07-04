import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { UserService } from "./user.service.js";

export class UserController {
  // GET /user/notification-preferences
  static async getPreferences(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const userId = req.user.user_id || req.user.id;
      const preferences = await UserService.getNotificationPreferences(userId);

      return res.json({ preferences });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // PUT /user/notification-preferences
  static async updatePreferences(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const userId = req.user.user_id || req.user.id;
      const { push, email } = req.body;

      if (!push && !email) {
        return res.status(400).json({
          message: "Provide at least one channel preference (push or email).",
        });
      }

      await UserService.updateNotificationPreferences(userId, { push, email });

      return res.json({ message: "Preferences updated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}
