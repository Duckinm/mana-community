ALTER TABLE "documents" ADD COLUMN "public_access_revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "public_access_rotated_at" timestamp with time zone;
