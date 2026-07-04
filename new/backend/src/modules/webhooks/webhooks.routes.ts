import { Router, Request, Response } from "express";
import { PaystackService } from "../../utils/paystack.js";
import { FacilityService } from "../facility/facility.service.js";

const router = Router();

router.post("/paystack", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string | undefined;

    // Use rawBody if captured, fallback to stringified body
    const rawBody = (req as any).rawBody 
      ? (req as any).rawBody.toString("utf8") 
      : JSON.stringify(req.body);

    if (!PaystackService.verifySignature(rawBody, signature)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const { event, data } = req.body;

    if (!event || !data || !data.reference) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    if (event === "charge.success") {
      await FacilityService.processPaystackWebhook(data.reference, "success");
    } else if (event === "charge.failed") {
      await FacilityService.processPaystackWebhook(data.reference, "failed");
    }

    return res.status(200).json({ status: "success" });
  } catch (error: any) {
    console.error("Paystack webhook error:", error.message);
    if (error.message === "TRANSACTION_NOT_FOUND") {
      // Even if transaction is not found, return 200 to acknowledge receipt as per standard practices
      return res.status(200).json({ status: "ignored", reason: "Transaction not found" });
    }
    return res.status(500).json({ message: "Webhook error" });
  }
});

export default router;
