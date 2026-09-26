-- The seeded "VAT 7% will be added" remark defaulted onto every QO/INV/RC. Only a
-- VAT registrant may tell a client that, and asserting it below the THB 1.8M
-- threshold invites an unregistered freelancer to collect tax they cannot collect.
-- Accounts seeded before the seed itself was fixed still carry it as a default.
UPDATE "remark_templates"
SET "default_for" = ARRAY[]::text[],
    "name" = 'ภาษีมูลค่าเพิ่ม (สำหรับผู้จด VAT)'
WHERE "body" LIKE '%ภาษีมูลค่าเพิ่ม (VAT 7%%'
  AND cardinality("default_for") > 0;
