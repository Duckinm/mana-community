CREATE TABLE "transaction_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"status" text DEFAULT 'previewed' NOT NULL,
	"rows_json" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"document_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"base_currency" text NOT NULL,
	"document_currency" text NOT NULL,
	"document_amount_cents" integer NOT NULL,
	"transaction_currency" text NOT NULL,
	"transaction_amount_cents" integer NOT NULL,
	"settlement_date" text NOT NULL,
	"booked_base_cents" integer NOT NULL,
	"settled_base_cents" integer NOT NULL,
	"fees_base_cents" integer DEFAULT 0 NOT NULL,
	"gain_loss_cents" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "input_vat_records" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" text,
	"supplier_name" text NOT NULL,
	"supplier_tax_id" text,
	"supplier_branch_number" text,
	"tax_invoice_number" text NOT NULL,
	"tax_invoice_date" text NOT NULL,
	"tax_base_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withholding_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" text,
	"contact_id" text,
	"sender_profile_id" text,
	"certificate_number" text NOT NULL,
	"payment_date" text NOT NULL,
	"income_type" text NOT NULL,
	"filing_form" text NOT NULL,
	"tax_base_cents" integer NOT NULL,
	"rate_bps" integer NOT NULL,
	"withheld_cents" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"remitted_at" text,
	"payer_name" text NOT NULL,
	"payer_tax_id" text,
	"payer_branch_number" text,
	"payer_address" text,
	"payee_name" text NOT NULL,
	"payee_tax_id" text,
	"payee_branch_number" text,
	"payee_address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "import_batch_id" text;--> statement-breakpoint
ALTER TABLE "transaction_import_batches" ADD CONSTRAINT "transaction_import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_settlements" ADD CONSTRAINT "fx_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_settlements" ADD CONSTRAINT "fx_settlements_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_settlements" ADD CONSTRAINT "fx_settlements_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_vat_records" ADD CONSTRAINT "input_vat_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_vat_records" ADD CONSTRAINT "input_vat_records_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withholding_certificates" ADD CONSTRAINT "withholding_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withholding_certificates" ADD CONSTRAINT "withholding_certificates_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withholding_certificates" ADD CONSTRAINT "withholding_certificates_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withholding_certificates" ADD CONSTRAINT "withholding_certificates_sender_profile_id_sender_profiles_id_fk" FOREIGN KEY ("sender_profile_id") REFERENCES "public"."sender_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_import_batches_user_file_hash_idx" ON "transaction_import_batches" USING btree ("user_id","file_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "fx_settlements_transaction_idx" ON "fx_settlements" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "fx_settlements_user_settlement_date_idx" ON "fx_settlements" USING btree ("user_id","settlement_date");--> statement-breakpoint
CREATE INDEX "input_vat_records_user_tax_invoice_date_idx" ON "input_vat_records" USING btree ("user_id","tax_invoice_date");--> statement-breakpoint
CREATE INDEX "input_vat_records_transaction_idx" ON "input_vat_records" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "withholding_certificates_user_number_idx" ON "withholding_certificates" USING btree ("user_id","certificate_number");--> statement-breakpoint
CREATE INDEX "withholding_certificates_user_payment_date_idx" ON "withholding_certificates" USING btree ("user_id","payment_date");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_transaction_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."transaction_import_batches"("id") ON DELETE set null ON UPDATE no action;