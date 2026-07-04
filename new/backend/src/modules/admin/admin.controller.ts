import { Response } from "express";
import bcrypt from "bcrypt";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { generatePassword } from "../../utils/password";
import { AuthRequest } from "../../middleware/auth.middleware";

export class AdminController {
  static async createFacility(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
      }
      const {
        facility_name,
        location,
        admin_email,
        facility_type,
        phone,
        latitude,
        longitude,
      } = req.body;

      if (!facility_name || !location || !admin_email || !facility_type || !phone) {
        return res.status(400).json({ message: "Missing fields" });
      }

      if (req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const existing = await prisma.user.findUnique({
        where: { email: admin_email },
      });

      if (existing) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const facility = await prisma.facility.create({
        data: {
          name: facility_name,
          location,
          type: facility_type,
          phone,
          ...(latitude !== undefined && { latitude: Number(latitude) }),
          ...(longitude !== undefined && { longitude: Number(longitude) }),
        },
      });

      const password = generatePassword();
      const hashed = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email: admin_email,
          passwordHash: hashed,
          role: "FACILITY_ADMIN",
          facilityId: facility.id,
          isFirstLogin: true,
          createdBy: req.user.user_id,
        },
      });

      return res.status(201).json({
        facility,
        admin: {
          email: admin_email,
          role: "facility_admin",
          initial_password: password,
        },
      });
    } catch (err: any) {
      console.error(err);

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(",")
          : String(err.meta?.target ?? "");

        if (target.includes("name")) {
          return res.status(409).json({ message: "Facility name already exists" });
        }

        if (target.includes("email")) {
          return res.status(409).json({ message: "Admin email already exists" });
        }
      }

      return res.status(500).json({ message: "Server error" });
    }
  }

  static async createManager(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
      }
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!["inventory_manager", "coordination_manager"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (req.user.role !== "FACILITY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res.status(409).json({ message: "Email exists" });
    }

    const password = generatePassword();
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        role: role.toUpperCase() as Role,
        facilityId: req.user.facility_id,
        isFirstLogin: true,
        createdBy: req.user.user_id,
      },
    });

    return res.status(201).json({
      manager: {
        id: user.id,
        email: user.email,
        role,
        facility_id: user.facilityId,
        initial_password: password,
      },
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

static async getManagers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
      }
      const roleQuery = Array.isArray(req.query.role)
        ? req.query.role[0]
        : req.query.role;
      const requestedRole = roleQuery
        ? (roleQuery.toString().toUpperCase() as Role)
        : undefined;

      const where: Prisma.UserWhereInput = {
        facilityId: req.user.facility_id,
      };

      if (requestedRole) {
        where.role = requestedRole;
      } else {
        where.role = {
          in: ["INVENTORY_MANAGER", "COORDINATION_MANAGER"],
        };
      }

      const managers = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isFirstLogin: true,
          createdAt: true,
        },
      });

      return res.json({ managers });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  }
static async deleteManager(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
      }
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({ message: "Missing user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: "Not found" });
    }

    if (user.facilityId !== req.user.facility_id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (user.role === "FACILITY_ADMIN") {
      return res.status(403).json({ message: "Cannot delete admin" });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ message: "User deactivated" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

  static async getReports(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const facilities = await prisma.facility.findMany({
        include: {
          inventory: true,
          _count: {
            select: { users: true }
          }
        }
      });

      // Compute statistics
      const totalFacilities = facilities.length;
      let totalMovableItems = 0;
      let totalBedCapacity = 0;

      facilities.forEach(fac => {
        fac.inventory.forEach(item => {
          if (item.isMovable) {
            totalMovableItems += item.quantity || 0;
          } else {
            totalBedCapacity += item.available || 0;
          }
        });
      });

      // Recent activity
      const recentAudits = await prisma.inventoryAudit.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc"
        },
        include: {
          inventoryItem: {
            include: {
              facility: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      const userIds = recentAudits.map(a => a.changedBy);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true }
      });
      const userMap = new Map(users.map(u => [u.id, u.email]));
      const recentActivity = recentAudits.map(audit => ({
        id: audit.id,
        inventoryItemId: audit.inventoryItemId,
        changedBy: audit.changedBy,
        userEmail: userMap.get(audit.changedBy) || "System Operator",
        resourceType: audit.inventoryItem.resourceType,
        resourceName: audit.inventoryItem.name,
        bloodGroup: audit.inventoryItem.bloodGroup,
        facilityName: audit.inventoryItem.facility.name,
        newValue: audit.newValue,
        createdAt: audit.createdAt
      }));

      return res.json({
        stats: {
          totalFacilities,
          totalMovableItems,
          totalBedCapacity
        },
        facilities,
        recentActivity
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}