import { Router } from "express";

import { AuthController } from "./auth.controller";
import { loginRateLimiter } from "../../middleware/rateLimiter";
import { authMiddleware } from "../../middleware/auth.middleware";
import { AdminController } from "../admin/admin.controller";

const router = Router();

router.post(
  "/login",
  loginRateLimiter,
  AuthController.login
);
router.post("/reset-password", 
  authMiddleware, 
  AuthController.resetPassword);

router.post("/change-password", 
  authMiddleware, 
  AuthController.changePassword);
  
router.post("/admin/facilities", authMiddleware, AdminController.createFacility);

router.post("/facility/managers", authMiddleware, AdminController.createManager);

router.get("/facility/managers", authMiddleware, AdminController.getManagers);

router.delete("/facility/managers/:id", authMiddleware, AdminController.deleteManager);

router.get("/admin/reports", authMiddleware, AdminController.getReports);

export default router;