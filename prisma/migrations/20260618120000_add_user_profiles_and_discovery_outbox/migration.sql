-- Create the canonical user profile without modifying existing production tables.
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "discovery_completed" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMPTZ(3),
    "usage_context" TEXT,
    "preferred_style" TEXT,
    "core" JSONB,
    "dynamics" JSONB,
    "predictive" JSONB,
    "compact_profile" TEXT,
    "profile_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_profiles_usage_context_check"
        CHECK ("usage_context" IS NULL OR "usage_context" IN ('personal', 'professional')),
    CONSTRAINT "user_profiles_preferred_style_check"
        CHECK ("preferred_style" IS NULL OR "preferred_style" IN ('direct', 'supportive', 'balanced'))
);

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
CREATE INDEX "user_profiles_discovery_completed_idx" ON "user_profiles"("discovery_completed");

ALTER TABLE "user_profiles"
ADD CONSTRAINT "user_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill every user that exists at migration time as legacy/completed.
-- Preserve consent timestamps from the experimental table when available.
INSERT INTO "user_profiles" (
    "id",
    "user_id",
    "discovery_completed",
    "consented_at",
    "created_at",
    "updated_at"
)
SELECT
    u."id",
    u."id",
    true,
    udp."consentimentoEm",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN "user_discovery_profiles" udp ON udp."userId" = u."id"
ON CONFLICT ("user_id") DO UPDATE SET
    "discovery_completed" = true,
    "consented_at" = COALESCE("user_profiles"."consented_at", EXCLUDED."consented_at"),
    "updated_at" = CURRENT_TIMESTAMP;

CREATE TABLE "discovery_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT 'discovery.completed.v1',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "discovery_events_status_check"
        CHECK ("status" IN ('pending', 'processing', 'processed', 'failed')),
    CONSTRAINT "discovery_events_attempts_check" CHECK ("attempts" >= 0),
    CONSTRAINT "discovery_events_schema_version_check" CHECK ("schema_version" > 0)
);

CREATE INDEX "discovery_events_user_id_idx" ON "discovery_events"("user_id");
CREATE INDEX "discovery_events_pending_idx"
ON "discovery_events"("available_at")
WHERE "status" IN ('pending', 'failed');

ALTER TABLE "discovery_events"
ADD CONSTRAINT "discovery_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
