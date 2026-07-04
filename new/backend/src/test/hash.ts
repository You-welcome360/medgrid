import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

async function run() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  // 1. Create SUPER_ADMIN
  const superAdminEmail = "admin@medgrid.com";
  let superAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail }
  });

  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        role: "SUPER_ADMIN",
        isFirstLogin: false,
        isActive: true,
      }
    });
    console.log("Super Admin created successfully:", superAdmin.email);
  } else {
    console.log("Super Admin already exists:", superAdmin.email);
  }

  // 2. Create sample Facility
  const facilityName = "Metro Hospital";
  let facility = await prisma.facility.findUnique({
    where: { name: facilityName }
  });

  if (!facility) {
    facility = await prisma.facility.create({
      data: {
        name: facilityName,
        location: "5.6037,-0.1870 Accra GH", // Lat/Long coordinates
        type: "HOSPITAL",
        phone: "+233201234567"
      }
    });
    console.log("Sample Facility created successfully:", facility.name);
  } else {
    console.log("Sample Facility already exists:", facility.name);
  }

  // 3. Create Facility Admin
  const facilityAdminEmail = "metro-admin@medgrid.com";
  let facilityAdmin = await prisma.user.findUnique({
    where: { email: facilityAdminEmail }
  });

  if (!facilityAdmin) {
    facilityAdmin = await prisma.user.create({
      data: {
        email: facilityAdminEmail,
        passwordHash,
        role: "FACILITY_ADMIN",
        facilityId: facility.id,
        isFirstLogin: false,
        isActive: true,
      }
    });
    console.log("Facility Admin created successfully:", facilityAdmin.email);
  } else {
    console.log("Facility Admin already exists:", facilityAdmin.email);
  }

  // 4. Create Inventory Manager
  const managerEmail = "metro-manager@medgrid.com";
  let manager = await prisma.user.findUnique({
    where: { email: managerEmail }
  });

  if (!manager) {
    manager = await prisma.user.create({
      data: {
        email: managerEmail,
        passwordHash,
        role: "INVENTORY_MANAGER",
        facilityId: facility.id,
        isFirstLogin: false,
        isActive: true,
      }
    });
    console.log("Inventory Manager created successfully:", manager.email);
  } else {
    console.log("Inventory Manager already exists:", manager.email);
  }

  // 5. Create some sample inventory items if empty
  const itemCount = await prisma.inventoryItem.count({
    where: { facilityId: facility.id }
  });

  if (itemCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        {
          facilityId: facility.id,
          resourceType: "BLOOD",
          bloodGroup: "O_POS",
          quantity: 250,
          isMovable: true,
        },
        {
          facilityId: facility.id,
          resourceType: "BLOOD",
          bloodGroup: "A_NEG",
          quantity: 45,
          isMovable: true,
        },
        {
          facilityId: facility.id,
          resourceType: "DRUG",
          name: "Amoxicillin 500mg",
          quantity: 1200,
          price: 1.50,
          expiryDate: new Date("2027-12-31"),
          isMovable: true,
        },
        {
          facilityId: facility.id,
          resourceType: "ICU_BED",
          total: 30,
          available: 12,
          isMovable: false,
        },
        {
          facilityId: facility.id,
          resourceType: "VENTILATOR",
          total: 15,
          available: 4,
          isMovable: false,
        }
      ]
    });
    console.log("Sample inventory items seeded successfully!");
  } else {
    console.log("Inventory already contains items, skipping inventory seeding.");
  }
}

run()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



