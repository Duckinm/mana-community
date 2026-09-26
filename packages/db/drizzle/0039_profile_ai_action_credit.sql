ALTER TABLE "users" ADD COLUMN "profile_ai_action_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_ai_reward_claimed_at" timestamp with time zone;
