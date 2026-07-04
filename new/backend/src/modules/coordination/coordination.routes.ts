import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { CoordinationController } from "./coordination.controller.js";
import { prisma } from "../../config/prisma.js";

const router = Router();

// Friendly labels for non-named resource types
const RESOURCE_LABELS: Record<string, string> = {
  ICU_BED: "ICU Bed",
  VENTILATOR: "Ventilator",
  OPERATING_THEATRE: "Operating Theatre",
  OXYGEN_CYLINDER: "Oxygen Cylinder",
  OTHER_SUPPLY: "General Supply",
};

/**
 * Resource types catalog.
 * Auto-syncs from the network inventory on every call so that any item
 * that exists in stock immediately becomes requestable via coordination.
 */
router.get("/resource-types", authMiddleware, async (_req, res) => {
  try {
    const today = new Date();

    // 1. Fetch all distinct in-stock, non-expired inventory items network-wide
    const networkItems = await prisma.inventoryItem.findMany({
      where: {
        OR: [{ quantity: { gt: 0 } }, { available: { gt: 0 } }],
        AND: [
          {
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: today } },
            ],
          },
        ],
      },
      distinct: ["resourceType", "name", "bloodGroup"],
      select: {
        resourceType: true,
        name: true,
        bloodGroup: true,
        price: true,
      },
    });

    // 2. Derive a stable display name + price for each unique item
    const toUpsert = networkItems.map((item) => {
      let displayName: string;
      let defaultPrice = Number(item.price ?? 0);

      if (item.resourceType === "BLOOD" && item.bloodGroup) {
        // e.g. "A_POS" → "Blood A +"
        const bg = item.bloodGroup
          .replace("_POS", " +")
          .replace("_NEG", " -");
        displayName = `Blood ${bg}`;
        defaultPrice = 0; // blood is always free
      } else if (item.name) {
        displayName = item.name;
      } else {
        displayName = RESOURCE_LABELS[item.resourceType] ?? item.resourceType;
        defaultPrice = 0;
      }

      return { displayName, resourceType: item.resourceType, defaultPrice };
    });

    // 3. Upsert each unique resource into the catalog (keyed by name)
    //    `update: {}` means we never overwrite a price that was manually set.
    await Promise.all(
      toUpsert.map(({ displayName, resourceType, defaultPrice }) =>
        prisma.resourceTypeInfo.upsert({
          where: { name: displayName },
          update: {}, // preserve any manually adjusted prices
          create: {
            name: displayName,
            type: resourceType,
            defaultPrice,
          },
        })
      )
    );

    // 4. Return the full up-to-date catalog
    const types = await prisma.resourceTypeInfo.findMany({
      orderBy: { name: "asc" },
    });

    return res.json({
      resource_types: types.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        default_price: Number(t.defaultPrice),
      })),
    });
  } catch (err) {
    console.error("[resource-types]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// List + create
router.post("/requests", authMiddleware, CoordinationController.createRequest);
router.get("/requests", authMiddleware, CoordinationController.getRequests);

// Emergency: nearby requests — must come BEFORE /:id routes to avoid conflict
router.get("/requests/nearby", authMiddleware, CoordinationController.getNearbyRequests);

// Single request
router.get("/requests/:id", authMiddleware, CoordinationController.getRequestById);

// State transitions
router.put("/requests/:id/acknowledge", authMiddleware, CoordinationController.acknowledgeRequest);
router.put("/requests/:id/fulfill", authMiddleware, CoordinationController.fulfillRequest);
router.put("/requests/:id/cancel", authMiddleware, CoordinationController.cancelRequest);

export default router;
