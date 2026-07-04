-- Phase 2: Emergency coordination support

-- -----------------------------------------------------------------------
-- Facility: add geolocation for broadcast radius queries
-- -----------------------------------------------------------------------
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "latitude"  DOUBLE PRECISION;
ALTER TABLE "Facility" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- -----------------------------------------------------------------------
-- coordination_requests: add any columns that exist in the Prisma schema
-- but were never formally migrated to the live database
-- -----------------------------------------------------------------------
ALTER TABLE "coordination_requests" ADD COLUMN IF NOT EXISTS "classification"       TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "coordination_requests" ADD COLUMN IF NOT EXISTS "broadcast_radius_km"  INTEGER;
ALTER TABLE "coordination_requests" ADD COLUMN IF NOT EXISTS "acknowledged_by"      TEXT;
ALTER TABLE "coordination_requests" ADD COLUMN IF NOT EXISTS "acknowledged_at"      TIMESTAMP(3);
ALTER TABLE "coordination_requests" ADD COLUMN IF NOT EXISTS "expires_at"           TIMESTAMP(3);
ALTER TABLE "coordination_requests" ADD COLUMN IF NOT EXISTS "deleted_at"           TIMESTAMP(3);

-- -----------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "coordination_requests_classification_idx" ON "coordination_requests"("classification");
CREATE INDEX IF NOT EXISTS "coordination_requests_expires_at_idx"     ON "coordination_requests"("expires_at");
