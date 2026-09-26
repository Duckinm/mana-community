DROP INDEX "calendar_connections_user_provider_idx";--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "calendar_connection_id" text;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_connection_id_calendar_connections_id_fk" FOREIGN KEY ("calendar_connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_provider_calendar_idx" UNIQUE NULLS NOT DISTINCT("user_id","provider","calendar_id");