#!/bin/sh
set -eu

case "${1:-}" in
  ""|--init-only) ;;
  *) echo "Usage: sh scripts/self-host.sh [--init-only]" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."
docker compose version >/dev/null
docker info >/dev/null

if [ ! -e .env.selfhost ]; then
  docker run --rm --user "$(id -u):$(id -g)" \
    --mount "type=bind,source=$(pwd),target=/workspace" \
    --workdir /workspace oven/bun:1.3.10-slim bun -e '
      import { writeFileSync } from "node:fs";
      import { randomBytes } from "node:crypto";
      const secret = () => randomBytes(32).toString("hex");
      const values = {
        POSTGRES_PASSWORD: secret(),
        BETTER_AUTH_SECRET: secret(),
        R2_ACCESS_KEY_ID: randomBytes(16).toString("hex"),
        R2_SECRET_ACCESS_KEY: secret(),
        MANA_WEB_PORT: "3300",
        MANA_S3_PORT: "39000",
        MANA_MAIL_PORT: "38025",
      };
      writeFileSync(".env.selfhost", Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
    '
  echo "Created .env.selfhost. Keep this file with your backups; existing secrets are never overwritten."
fi

if [ "${1:-}" = --init-only ]; then
  exit 0
fi

docker compose --env-file .env.selfhost -f compose.selfhost.yml up --build --wait --wait-timeout 180
web_address=$(docker compose --env-file .env.selfhost -f compose.selfhost.yml port web 3000)
mail_address=$(docker compose --env-file .env.selfhost -f compose.selfhost.yml port mail 8025)
echo "MANA is ready at http://localhost:${web_address##*:}; open http://localhost:${mail_address##*:} for local verification emails."
