CREATE TABLE "user_profitability_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_date" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"plan" text NOT NULL,
	"billing_interval" text,
	"subscription_status" text,
	"estimated_monthly_revenue_cents" integer NOT NULL,
	"currency" text,
	"ai_cost_usd" double precision NOT NULL,
	"reporting_currency" text NOT NULL,
	"estimated_profit_reporting_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profitability_snapshots" ADD CONSTRAINT "user_profitability_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profitability_snapshots_date_user_idx" ON "user_profitability_snapshots" USING btree ("snapshot_date","user_id");--> statement-breakpoint
CREATE INDEX "user_profitability_snapshots_date_profit_idx" ON "user_profitability_snapshots" USING btree ("snapshot_date","estimated_profit_reporting_cents");