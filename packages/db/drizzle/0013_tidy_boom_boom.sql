CREATE TABLE "slip_verify_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"year_month" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "qr_checked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "qr_found" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "qr_raw_text" text;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "qr_warning" text;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "api_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "api_verification_provider" text;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "api_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD COLUMN "api_verification_raw" jsonb;--> statement-breakpoint
ALTER TABLE "slip_verify_usage" ADD CONSTRAINT "slip_verify_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slip_verify_usage_user_month_idx" ON "slip_verify_usage" USING btree ("user_id","year_month");