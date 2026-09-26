ALTER TABLE "ai_action_usage" ADD COLUMN "input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_action_usage" ADD COLUMN "output_tokens" integer DEFAULT 0 NOT NULL;