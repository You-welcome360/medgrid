import { Request, Response } from "express";

import { loginSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../middleware/auth.middleware";

export class AuthController {

  static async login(req: Request, res: Response) {

    try {

      const validatedData = loginSchema.parse(req.body);

      const result = await AuthService.login(validatedData);

      return res.status(200).json(result);

    } catch (error: any) {

      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }

      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      console.error(error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }

    // ---------------- RESET PASSWORD ----------------
  static async resetPassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const { new_password } = req.body;

      if (!new_password || new_password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }

      if (!req.user.is_first_login) {
        return res.status(403).json({
          message: "Not allowed. Already completed first login.",
        });
      }

      const result = await AuthService.resetPassword(
        req.user.user_id,
        new_password
      );

      return res.status(200).json({
        message: "Password reset successfully",
        ...result,
      });
    } catch (err: any) {
      if (err.message === "SAME_PASSWORD") {
        return res.status(409).json({ message: "Password cannot be reused" });
      }

      return res.status(500).json({ message: "Server error" });
    }
  }

  // ---------------- CHANGE PASSWORD ----------------
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({
          message: "Both fields are required",
        });
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }

      const result = await AuthService.changePassword(
        req.user.user_id,
        current_password,
        new_password
      );

      return res.status(200).json({
        message: "Password changed successfully",
        ...result,
      });
    } catch (err: any) {
      if (err.message === "INVALID_PASSWORD") {
        return res.status(401).json({
          message: "Current password is incorrect",
        });
      }

      if (err.message === "SAME_PASSWORD") {
        return res.status(409).json({
          message: "New password cannot be same as current password",
        });
      }

      return res.status(500).json({ message: "Server error" });
    }
  }


}