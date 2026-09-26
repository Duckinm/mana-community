-- Custom SQL migration file, put your code below! --
UPDATE "users" SET "role" = 'admin' WHERE "email" = 'duckii.mt@gmail.com';