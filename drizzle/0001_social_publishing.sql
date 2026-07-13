-- Social publishing + token monitoring columns for the executions table.
-- Run with `pnpm db:generate && pnpm db:migrate`, or paste directly into the Neon SQL editor.

CREATE TYPE "media_type" AS ENUM ('text', 'image', 'video');

ALTER TABLE "executions"
  ADD COLUMN IF NOT EXISTS "platforms"           jsonb        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "media_type"          "media_type" NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS "prompt_tokens"       integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completion_tokens"   integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "error_message"       text         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "engine_execution_id" text         NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "executions_user_id_idx"    ON "executions" ("user_id");
CREATE INDEX IF NOT EXISTS "executions_created_at_idx" ON "executions" ("created_at");
