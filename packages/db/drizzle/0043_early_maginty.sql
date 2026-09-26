DROP TABLE "time_entries" CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_end" timestamp with time zone;