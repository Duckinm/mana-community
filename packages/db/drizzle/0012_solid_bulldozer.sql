CREATE TABLE "payment_slips" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"file_id" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"extracted_amount_cents" integer,
	"extracted_currency" text,
	"extracted_date" text,
	"extracted_ref" text,
	"ai_uncertain" boolean DEFAULT false NOT NULL,
	"mismatch_warning" text,
	"transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_file_id_storage_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."storage_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_slips" ADD CONSTRAINT "payment_slips_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;