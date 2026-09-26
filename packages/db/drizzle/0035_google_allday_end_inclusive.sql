-- Google all-day events were stored with Google's exclusive end.date; MANA stores the last day.
UPDATE "calendar_events"
SET "end_date" = to_char("end_date"::date - 1, 'YYYY-MM-DD')
WHERE "source" = 'google'
  AND "all_day" = true
  AND "start_date" IS NOT NULL
  AND "end_date" > "start_date";
