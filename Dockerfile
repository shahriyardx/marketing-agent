# syntax=docker/dockerfile:1
#   docker build -t marketing-agent .
#   docker run -p 3000:3000 --env-file .env marketing-agent
# On start, entrypoint.sh applies Prisma migrations, then runs the server.

FROM node:24-slim AS base
# OpenSSL so Prisma can tell which engine build to use (slim has none).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies from bun.lock. Only the manifest is copied first, so a code
# change does not reinstall anything.
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# The app. Env validation is skipped; real values come at runtime. The auth
# secret is a placeholder only so the build does not log warnings.
FROM deps AS build
COPY . .
ENV SKIP_ENV_VALIDATION=true
RUN npx prisma generate
RUN --mount=type=cache,target=/app/.next/cache \
    BETTER_AUTH_SECRET=build-placeholder-not-used-at-runtime npx next build

# Only the Prisma CLI, for `prisma migrate deploy` in entrypoint.sh, copied out
# of the locked install so every package is the version bun.lock pins.
FROM deps AS prisma-cli
COPY docker/prisma-cli.mjs /tmp/prisma-cli.mjs
RUN node /tmp/prisma-cli.mjs

# The app image (the default target).
FROM node:24-slim AS runner
WORKDIR /app
# openssl for the Prisma schema engine that `prisma migrate deploy` runs.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=prisma-cli /cli/node_modules ./node_modules
COPY entrypoint.sh ./

USER node
EXPOSE 3000
CMD ["./entrypoint.sh"]
