import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { FacilityController } from "./facility.controller.js";

const router = Router();

router.get("/profile", authMiddleware, FacilityController.getProfile);
router.patch("/profile", authMiddleware, FacilityController.updateProfile);

router.get("/balance", authMiddleware, FacilityController.getBalance);
router.post("/balance/top-up", authMiddleware, FacilityController.initializeTopUp);
router.get("/balance/history", authMiddleware, FacilityController.getBalanceHistory);

export default router;

