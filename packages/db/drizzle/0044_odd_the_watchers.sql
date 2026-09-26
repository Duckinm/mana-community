INSERT INTO cms_keywords (id, term, locale, priority, created_at, updated_at)
SELECT id, term, 'th', priority, now(), now()
FROM (VALUES
  ('cms-keyword-pricing', 'ตั้งราคางานฟรีแลนซ์', 12),
  ('cms-keyword-scope', 'ขอบเขตงานฟรีแลนซ์', 11),
  ('cms-keyword-quote', 'ใบเสนอราคาฟรีแลนซ์', 10),
  ('cms-keyword-collections', 'ทวงเงินลูกค้า', 9),
  ('cms-keyword-contract', 'สัญญาจ้างฟรีแลนซ์', 8),
  ('cms-keyword-cash-flow', 'กระแสเงินสดฟรีแลนซ์', 7),
  ('cms-keyword-client-management', 'บริหารลูกค้าฟรีแลนซ์', 6),
  ('cms-keyword-work-planning', 'วางแผนงานฟรีแลนซ์', 5),
  ('cms-keyword-emergency-fund', 'เงินสำรองฟรีแลนซ์', 4),
  ('cms-keyword-tax', 'ภาษีฟรีแลนซ์', 3),
  ('cms-keyword-etax', 'ใบกำกับภาษีอิเล็กทรอนิกส์', 2),
  ('cms-keyword-promptpay', 'PromptPay รับเงิน', 1)
) AS defaults(id, term, priority)
WHERE NOT EXISTS (SELECT 1 FROM cms_keywords WHERE cms_keywords.term = defaults.term)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE UNIQUE INDEX "articles_daily_ai_keyword_idx" ON "articles" USING btree ("keyword_id",(("created_at" AT TIME ZONE 'Asia/Bangkok')::date)) WHERE "articles"."generated_by" = 'ai' and "articles"."content_type" = 'evergreen' and "articles"."keyword_id" is not null and "articles"."deleted_at" is null;
