DROP INDEX "transaction_import_batches_user_file_hash_idx";--> statement-breakpoint
ALTER TABLE "transaction_import_batches" ADD COLUMN "base_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_import_batches_user_file_hash_idx" ON "transaction_import_batches" USING btree ("user_id","file_hash","base_currency");