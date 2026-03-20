ALTER TABLE "family_messages" ADD COLUMN IF NOT EXISTS "message_type" varchar DEFAULT 'family' NOT NULL;
