# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/data/micasa.db

# --- dependencias (incluye compilación de better-sqlite3 si no hay binario) ---
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- CLI de Prisma solo para aplicar migraciones al arrancar ---
FROM base AS migrator
RUN npm init -y >/dev/null && npm install --omit=dev prisma@7.10.0 dotenv

# --- imagen final ---
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Argentina/Buenos_Aires \
    DATABASE_URL=file:/data/micasa.db

RUN mkdir -p /data && chown node:node /data
COPY --from=migrator --chown=node:node /app/node_modules ./migrator/node_modules
COPY --from=builder --chown=node:node /app/prisma ./migrator/prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./migrator/prisma.config.ts
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node docker-entrypoint.sh ./

USER node
VOLUME ["/data"]
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
