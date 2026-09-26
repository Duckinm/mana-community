UPDATE "calendar_events" e
SET "calendar_connection_id" = c."id"
FROM "calendar_connections" c
WHERE c."user_id" = e."user_id"
  AND c."provider" = 'google'
  AND e."external_id" IS NOT NULL
  AND e."calendar_connection_id" IS NULL;