import { prisma } from "../config/prisma.js";
import { notifyRequestExpired } from "./notification.service.js";

const INTERVAL_MS = 60 * 1000; // run every 60 seconds

async function closeExpiredRequests(): Promise<void> {
  const now = new Date();

  // Find all open/acknowledged emergency requests that have passed their expiry
  const expired = await prisma.coordinationRequest.findMany({
    where: {
      classification: "emergency",
      status: { in: ["open", "acknowledged"] },
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  if (expired.length === 0) return;

  const ids = expired.map((r) => r.id);

  // Bulk-update to expired
  await prisma.coordinationRequest.updateMany({
    where: { id: { in: ids } },
    data: { status: "expired" },
  });

  console.log(`[ExpiryWorker] Closed ${ids.length} expired request(s)`);

  // Fire notifications for each (non-blocking)
  for (const { id } of expired) {
    notifyRequestExpired(id).catch((err) =>
      console.error("[ExpiryWorker] notify failed:", err.message)
    );
  }
}

export function startExpiryWorker(): void {
  // Run once immediately on startup, then on interval
  closeExpiredRequests().catch((err) =>
    console.error("[ExpiryWorker] initial run failed:", err.message)
  );

  setInterval(() => {
    closeExpiredRequests().catch((err) =>
      console.error("[ExpiryWorker] tick failed:", err.message)
    );
  }, INTERVAL_MS);

  console.log("[ExpiryWorker] Started — checking every 60s");
}
