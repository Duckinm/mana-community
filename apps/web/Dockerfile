# syntax=docker/dockerfile:1
FROM oven/bun:1.3.10 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN bun install --frozen-lockfile --ignore-scripts --filter @mana/web
COPY packages ./packages
COPY apps/web ./apps/web
# Vite envs are baked at build time — an undeclared ARG is silently dropped by Docker,
# so every build arg passed in fly.toml must also be listed here
ARG VITE_API_URL
ARG VITE_SENTRY_DSN
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
ENV VITE_API_URL=$VITE_API_URL VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
# secret mount keeps the Sentry auth token out of image layers/history —
# only present in CI; local builds run without it and skip the upload
RUN cd apps/web && bun run build

FROM oven/bun:1.3.10-slim
ENV NODE_ENV=production
WORKDIR /app
COPY LICENSE ./LICENSE
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
# server bundle externalizes react/tanstack/sentry — runtime deps required
# The SDK includes optional Vite tooling; its CLI is used only in the build stage.
RUN bun install --frozen-lockfile --production --ignore-scripts --filter @mana/web \
    && rm -rf /root/.bun/install/cache \
        node_modules/.bun/@sentry+vite-plugin@* \
        node_modules/.bun/@sentry+bundler-plugin-core@* \
        node_modules/.bun/@sentry+bundler-plugins@* \
        node_modules/.bun/@sentry+cli@* \
        node_modules/.bun/@sentry+cli-*@* \
    && test -z "$(find /app/node_modules -path '*/@sentry/cli*/package.json' -print -quit)"
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY apps/web/serve.ts ./apps/web/serve.ts
COPY scripts/license-inventory.ts ./scripts/license-inventory.ts
COPY THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY licenses ./licenses
RUN bun scripts/license-inventory.ts /app/third-party-notices.json

WORKDIR /app/apps/web
ENV PORT=3000
CMD ["bun", "serve.ts"]
