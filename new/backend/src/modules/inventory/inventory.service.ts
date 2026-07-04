import { prisma } from "../../config/prisma.js";

export class InventoryService {
  static async getFacilityInventory(facilityId: string) {
    return prisma.inventoryItem.findMany({
      where: {
        facilityId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async addBloodInventory(
    facilityId: string,
    userId: string,
    data: {
      bloodGroup:
        | "A_POS"
        | "A_NEG"
        | "B_POS"
        | "B_NEG"
        | "AB_POS"
        | "AB_NEG"
        | "O_POS"
        | "O_NEG";
      quantity: number;
      expiryDate: string;
    }
  ) {
    const item = await prisma.inventoryItem.create({
      data: {
        facilityId,
        resourceType: "BLOOD",
        bloodGroup: data.bloodGroup,
        quantity: data.quantity,
        expiryDate: new Date(data.expiryDate),
        isMovable: true,
      },
    });

    await prisma.inventoryAudit.create({
      data: {
        inventoryItemId: item.id,
        changedBy: userId,
        newValue: item as any,
      },
    });

    return item;
  }

  static async addDrugInventory(
  facilityId: string,
  userId: string,
  data: {
    name: string;
    quantity: number;
    price: number;
    expiryDate: string;
  }
) {
  const item = await prisma.inventoryItem.create({
    data: {
      facilityId,
      resourceType: "DRUG",
      name: data.name,
      quantity: data.quantity,
      price: data.price,
      expiryDate: new Date(data.expiryDate),
      isMovable: true,
    },
  });

  await prisma.inventoryAudit.create({
    data: {
      inventoryItemId: item.id,
      changedBy: userId,
      newValue: item as any,
    },
  });

  return item;
}

static async updateIcuBeds(
  facilityId: string,
  userId: string,
  data: {
    total: number;
    available: number;
  }
) {
  const item = await prisma.inventoryItem.create({
    data: {
      facilityId,
      resourceType: "ICU_BED",
      total: data.total,
      available: data.available,
      isMovable: false,
    },
  });

  await prisma.inventoryAudit.create({
    data: {
      inventoryItemId: item.id,
      changedBy: userId,
      newValue: item as any,
    },
  });

  return item;
}

static async updateVentilators(
  facilityId: string,
  userId: string,
  data: {
    total: number;
    available: number;
  }
) {
  const item = await prisma.inventoryItem.create({
    data: {
      facilityId,
      resourceType: "VENTILATOR",
      total: data.total,
      available: data.available,
      isMovable: false,
    },
  });

  await prisma.inventoryAudit.create({
    data: {
      inventoryItemId: item.id,
      changedBy: userId,
      newValue: item as any,
    },
  });

  return item;
}

static async updateOxygen(
  facilityId: string,
  userId: string,
  data: {
    total: number;
    available: number;
  }
) {
  const item = await prisma.inventoryItem.create({
    data: {
      facilityId,
      resourceType: "OXYGEN_CYLINDER",
      total: data.total,
      available: data.available,
      isMovable: true,
    },
  });

  await prisma.inventoryAudit.create({
    data: {
      inventoryItemId: item.id,
      changedBy: userId,
      newValue: item as any,
    },
  });

  return item;
}

static async updateTheatres(
  facilityId: string,
  userId: string,
  data: {
    total: number;
    available: number;
  }
) {
  const item = await prisma.inventoryItem.create({
    data: {
      facilityId,
      resourceType: "OPERATING_THEATRE",
      total: data.total,
      available: data.available,
      isMovable: false,
    },
  });

  await prisma.inventoryAudit.create({
    data: {
      inventoryItemId: item.id,
      changedBy: userId,
      newValue: item as any,
    },
  });

  return item;
}

static async addSupply(
  facilityId: string,
  userId: string,
  data: {
    name: string;
    quantity: number;
    price: number;
    expiryDate: string;
    category?: string;
    unitMeasure?: string;
  }
) {
  const item = await prisma.inventoryItem.create({
    data: {
      facilityId,
      resourceType: "OTHER_SUPPLY",
      name: data.name,
      quantity: data.quantity,
      price: data.price,
      expiryDate: new Date(data.expiryDate),
      category: data.category,
      unitMeasure: data.unitMeasure,
      isMovable: true,
    },
  });

  await prisma.inventoryAudit.create({
    data: {
      inventoryItemId: item.id,
      changedBy: userId,
      newValue: item as any,
    },
  });

  return item;
}
static async getNetworkResources() {
  const today = new Date();

  return prisma.inventoryItem.findMany({
    where: {
      OR: [
        {
          quantity: {
            gt: 0,
          },
        },
        {
          available: {
            gt: 0,
          },
        },
      ],
      AND: [
        {
          OR: [
            {
              expiryDate: null,
            },
            {
              expiryDate: {
                gte: today,
              },
            },
          ],
        },
      ],
    },

    distinct: [
      "resourceType",
      "name",
      "bloodGroup",
    ],

    select: {
      resourceType: true,
      name: true,
      bloodGroup: true,
      isMovable: true,
    },
  });
}

 static async getResourceFacilities(
    resourceType: string,
    bloodGroup?: string,
    name?: string
  ) {
    const today = new Date();

    const facilities = await prisma.inventoryItem.findMany({
      where: {
        resourceType: resourceType as any,

        ...(bloodGroup && {
          bloodGroup: bloodGroup as any,
        }),

        ...(name && {
          name,
        }),

        OR: [
          {
            quantity: {
              gt: 0,
            },
          },
          {
            available: {
              gt: 0,
            },
          },
        ],

        AND: [
          {
            OR: [
              {
                expiryDate: null,
              },
              {
                expiryDate: {
                  gte: today,
                },
              },
            ],
          },
        ],
      },

      include: {
        facility: {
          select: {
            id: true,
            name: true,
            location: true,
            type: true,
            phone: true,
          },
        },
      },
    });

    return facilities;
  }
}

