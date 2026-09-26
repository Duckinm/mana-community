ALTER TABLE "payment_slips" ADD COLUMN "trans_ref" text;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_trans_ref_unique" UNIQUE("trans_ref");