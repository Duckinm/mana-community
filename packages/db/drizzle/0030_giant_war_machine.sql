CREATE TABLE "article_events" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"type" text NOT NULL,
	"dwell_seconds" integer,
	"visitor_hash" text NOT NULL,
	"locale" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title_th" text,
	"title_en" text,
	"body_md_th" text,
	"body_md_en" text,
	"meta_description_th" text,
	"meta_description_en" text,
	"slug_th" text,
	"slug_en" text,
	"content_type" text DEFAULT 'trend' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"keyword_id" text,
	"generated_by" text DEFAULT 'human' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cms_competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_keywords" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"locale" text DEFAULT 'th' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"auto_publish" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_events" ADD CONSTRAINT "article_events_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_keyword_id_cms_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."cms_keywords"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_events_article_occurred_idx" ON "article_events" USING btree ("article_id","occurred_at");--> statement-breakpoint
CREATE INDEX "articles_status_publish_at_idx" ON "articles" USING btree ("status","publish_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_th_idx" ON "articles" USING btree ("slug_th") WHERE "articles"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_en_idx" ON "articles" USING btree ("slug_en") WHERE "articles"."deleted_at" is null;