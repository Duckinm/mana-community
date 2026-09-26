FROM oven/bun:1.3.10-slim

# chromium for playwright-core PDF generation (generate-pdf.ts)
# ghostscript for PDF/A-3 conversion (utils/pdf/pdfa.ts, e-Tax Invoice by Email)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation fonts-thai-tlwg ghostscript \
    && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app
COPY LICENSE ./LICENSE
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
# --ignore-scripts: root "prepare: husky" fails without devDeps; no trustedDependencies exist
RUN bun install --frozen-lockfile --production --ignore-scripts --os=linux --filter @mana/api \
    && rm -rf /root/.bun/install/cache \
    && cd apps/api \
    && bun -e 'await import("sharp")'

COPY packages ./packages
COPY apps/api ./apps/api
COPY scripts/license-inventory.ts ./scripts/license-inventory.ts
COPY THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY licenses ./licenses
RUN bun scripts/license-inventory.ts /app/third-party-notices.json

WORKDIR /app/apps/api
RUN bun run build
CMD ["bun", "dist/index.js"]
