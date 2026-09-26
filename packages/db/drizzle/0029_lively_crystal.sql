CREATE TABLE "cloud_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"account_id" text NOT NULL,
	"external_root_id" text NOT NULL,
	"external_root_name" text NOT NULL,
	"sync_cursor" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_error" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cloud_connections_user_provider_account_root_idx" UNIQUE("user_id","provider","account_id","external_root_id")
);
--> statement-breakpoint
CREATE TABLE "external_asset_links" (
	"id" text PRIMARY KEY NOT NULL,
	"external_asset_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_asset_links_asset_entity_idx" UNIQUE("external_asset_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "external_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"item_type" text DEFAULT 'file' NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"external_parent_id" text,
	"path" text NOT NULL,
	"checksum" text,
	"version" text,
	"provider_created_at" timestamp with time zone,
	"provider_modified_at" timestamp with time zone,
	"thumbnail_url" text,
	"web_url" text,
	"tags" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"remote_deleted_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_assets_connection_external_idx" UNIQUE("connection_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "cloud_connections" ADD CONSTRAINT "cloud_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_connections" ADD CONSTRAINT "cloud_connections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_asset_links" ADD CONSTRAINT "external_asset_links_external_asset_id_external_assets_id_fk" FOREIGN KEY ("external_asset_id") REFERENCES "public"."external_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_assets" ADD CONSTRAINT "external_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_assets" ADD CONSTRAINT "external_assets_connection_id_cloud_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."cloud_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cloud_connections_user_idx" ON "cloud_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "external_assets_user_idx" ON "external_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "external_assets_connection_idx" ON "external_assets" USING btree ("connection_id");