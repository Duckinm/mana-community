ALTER TABLE "feedback" ADD COLUMN "parent_feedback_id" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "split_state" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "split_part_count" integer;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_parent_feedback_id_feedback_id_fk" FOREIGN KEY ("parent_feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;