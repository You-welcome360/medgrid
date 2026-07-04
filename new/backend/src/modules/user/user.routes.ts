import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { UserController } from "./user.controller.js";

const router = Router();

router.get("/notification-preferences", authMiddleware, UserController.getPreferences);
router.put("/notification-preferences", authMiddleware, UserController.updatePreferences);

export default router;
