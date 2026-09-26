CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"direction" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"date" text NOT NULL,
	"note" text,
	"stripe_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_stripe_event_idx" ON "ledger_entries" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_date_idx" ON "ledger_entries" USING btree ("date");