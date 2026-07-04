import { Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { AuthRequest } from "./auth.middleware.js";
import { RESOURCE_ACCESS } from "../modules/inventory/resource.rules.js";

export const requireResourceAccess =
  (resource: string) =>
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const facility = await prisma.facility.findUnique({
      where: {
        id: req.user?.facility_id ?? "",
      },
    });

    if (!facility) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    const allowed =
      RESOURCE_ACCESS[
        facility.type as keyof typeof RESOURCE_ACCESS
      ];

    if (!allowed.includes(resource)) {
      return res.status(403).json({
        message:
          "Facility type cannot manage this resource",
      });
    }

    next();
  };