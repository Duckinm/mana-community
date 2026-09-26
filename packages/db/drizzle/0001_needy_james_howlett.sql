ALTER TABLE "remark_templates" ADD COLUMN "default_for" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
UPDATE "remark_templates" SET "default_for" = ARRAY['QO', 'INV', 'RC'] WHERE "is_default" = true;--> statement-breakpoint
ALTER TABLE "remark_templates" DROP COLUMN "is_default";
