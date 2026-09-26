ALTER TABLE "users" ADD COLUMN "disabled_external_mcp_tools" jsonb DEFAULT '[]'::jsonb NOT NULL;
