import { prisma, RequestStatus } from '@medgrid/database';
import { notifyRequestExpired } from '@medgrid/notifications';

export async function closeExpiredRequests() {
  const now = new Date();

  try {
    // Find open or acknowledged emergency requests that have expired
    const expiredRequests = await prisma.resourceRequest.findMany({
      where: {
        isEmergency: true,
        status: { in: [RequestStatus.PENDING, RequestStatus.ACCEPTED] },
        expiresAt: { lte: now },
      },
      select: { id: true },
    });

    if (expiredRequests.length === 0) return;

    const ids = expiredRequests.map((r) => r.id);

    // Update status to EXPIRED
    await prisma.resourceRequest.updateMany({
      where: { id: { in: ids } },
      data: { status: RequestStatus.EXPIRED },
    });

    console.log(`[ExpiryWorker] Expired ${expiredRequests.length} emergency requests`);

    // Trigger notification for each
    for (const r of expiredRequests) {
      notifyRequestExpired(r.id).catch((err) =>
        console.error(`[ExpiryWorker] Notification failed for ${r.id}:`, err.message)
      );
    }
  } catch (err: any) {
    console.error('[ExpiryWorker] Error running worker:', err.message);
  }
}

export function startExpiryWorker() {
  // Run once immediately
  closeExpiredRequests();

  // Run every 60 seconds
  setInterval(closeExpiredRequests, 60 * 1000);
}
