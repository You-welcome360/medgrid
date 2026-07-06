import cron from 'node-cron';
import { prisma, ExpirySeverity, RedistributionStatus, InventoryStatus } from '@medgrid/database';
import { deriveCurrentQuantity } from './inventory.repository';

export async function runExpiryCheck(): Promise<{
  alertsCreated: number;
  offersCreated: number;
  resolvedAlerts: number;
}> {
  console.log('[ExpiryCron] Starting scan of inventories...');

  const now = new Date();

  // Find all active items of type BLOOD or MEDICATION
  const items = await prisma.inventory.findMany({
    where: {
      deletedAt: null,
      resourceType: { in: ['BLOOD', 'MEDICATION'] },
    },
  });

  let alertsCreated = 0;
  let offersCreated = 0;
  let resolvedAlerts = 0;

  for (const item of items) {
    const metadata = item.metadata as Record<string, any>;
    if (!metadata || !metadata.expiryDate) continue;

    const quantity = await deriveCurrentQuantity(item.id);

    const expiryDate = new Date(metadata.expiryDate);
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let severity: ExpirySeverity | null = null;

    if (daysToExpiry > 60) {
      severity = ExpirySeverity.SAFE;
    } else if (daysToExpiry >= 14 && daysToExpiry <= 60) {
      severity = ExpirySeverity.WARNING;
    } else {
      severity = ExpirySeverity.CRITICAL;
    }

    if (severity === ExpirySeverity.SAFE) {
      // Resolve active alerts
      const resolved = await prisma.expiryAlert.updateMany({
        where: {
          inventoryId: item.id,
          resolvedAt: null,
        },
        data: {
          resolvedAt: now,
          daysToExpiry,
        },
      });
      if (resolved.count > 0) {
        resolvedAlerts += resolved.count;
      }
    } else {
      // Check for alert with the same severity
      const existingAlert = await prisma.expiryAlert.findFirst({
        where: {
          inventoryId: item.id,
          severity,
          resolvedAt: null,
        },
      });

      if (!existingAlert) {
        // Resolve different severity active alerts
        await prisma.expiryAlert.updateMany({
          where: {
            inventoryId: item.id,
            resolvedAt: null,
          },
          data: {
            resolvedAt: now,
          },
        });

        await prisma.expiryAlert.create({
          data: {
            inventoryId: item.id,
            facilityId: item.facilityId,
            expiryDate,
            daysToExpiry,
            severity,
          },
        });
        alertsCreated++;
      } else {
        // Update days remaining
        await prisma.expiryAlert.update({
          where: { id: existingAlert.id },
          data: { daysToExpiry },
        });
      }

      // Auto-create redistribution offer for critical items
      if (severity === ExpirySeverity.CRITICAL) {
        const existingOffer = await prisma.redistributionOffer.findFirst({
          where: {
            inventoryId: item.id,
            status: RedistributionStatus.OPEN,
          },
        });

        if (!existingOffer && quantity > 0) {
          await prisma.redistributionOffer.create({
            data: {
              inventoryId: item.id,
              facilityId: item.facilityId,
              quantity,
              unit: item.unit,
              price: 0.00, // Critical items are free
              status: RedistributionStatus.OPEN,
              expiresAt: expiryDate,
            },
          });
          offersCreated++;
        }

        // Auto-expire item on DB if date has passed
        if (daysToExpiry <= 0 && item.status !== InventoryStatus.EXPIRED) {
          await prisma.inventory.update({
            where: { id: item.id },
            data: { status: InventoryStatus.EXPIRED },
          });
        }
      }
    }
  }

  console.log(
    `[ExpiryCron] Scan complete. Alerts created: ${alertsCreated}, Offers created: ${offersCreated}, Resolved: ${resolvedAlerts}`
  );

  return { alertsCreated, offersCreated, resolvedAlerts };
}

export function initExpiryCron(): void {
  // '0 0 * * *' = every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await runExpiryCheck();
    } catch (err: any) {
      console.error('[ExpiryCron] Error during cron execution:', err.message);
    }
  });
}
