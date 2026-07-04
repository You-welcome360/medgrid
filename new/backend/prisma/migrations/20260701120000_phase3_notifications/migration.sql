-- Phase 3: Notifications & User Notification Preferences

-- Enums
CREATE TYPE "NotificationType" AS ENUM (
  'REQUEST_CREATED',
  'REQUEST_ACKNOWLEDGED',
  'REQUEST_FULFILLED',
  'REQUEST_CANCELED',
  'REQUEST_EXPIRED',
  'BALANCE_LOW',
  'BALANCE_TOPUP'
);

CREATE TYPE "NotificationChannel" AS ENUM (
  'WEBSOCKET',
  'PUSH',
  'EMAIL'
);

-- Notifications table
CREATE TABLE "notifications" (
  "id"           TEXT        NOT NULL,
  "user_id"      TEXT        NOT NULL,
  "facility_id"  TEXT        NOT NULL,
  "type"         "NotificationType"    NOT NULL,
  "channel"      "NotificationChannel" NOT NULL,
  "title"        TEXT        NOT NULL,
  "body"         TEXT        NOT NULL,
  "data"         JSONB,
  "read_at"      TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_idx"      ON "notifications"("user_id");
CREATE INDEX "notifications_facility_id_idx"  ON "notifications"("facility_id");
CREATE INDEX "notifications_type_idx"         ON "notifications"("type");
CREATE INDEX "notifications_read_at_idx"      ON "notifications"("read_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_facility_id_fkey"
    FOREIGN KEY ("facility_id") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- User notification preferences table
CREATE TABLE "user_notification_preferences" (
  "id"            TEXT        NOT NULL,
  "user_id"       TEXT        NOT NULL,
  "channel"       "NotificationChannel" NOT NULL,
  "enabled"       BOOLEAN     NOT NULL DEFAULT true,
  "emergency_only" BOOLEAN    NOT NULL DEFAULT false,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notification_preferences_user_id_channel_key"
  ON "user_notification_preferences"("user_id", "channel");

CREATE INDEX "user_notification_preferences_user_id_idx"
  ON "user_notification_preferences"("user_id");

ALTER TABLE "user_notification_preferences"
  ADD CONSTRAINT "user_notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
