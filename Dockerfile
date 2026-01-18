FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache su-exec git

RUN if ! getent group 1000 > /dev/null 2>&1; then \
        addgroup --system --gid 1000 appgroup; \
    fi

RUN if ! getent passwd 1000 > /dev/null 2>&1; then \
        GROUP_NAME=$(getent group 1000 | cut -d: -f1); \
        adduser --system --uid 1000 --gid "$GROUP_NAME" appuser; \
    fi

RUN mkdir -p /app/data/users /app/data/checklists /app/data/notes && \
    chown -R 1000:1000 /app/data

RUN mkdir -p /app/.next/cache && \
    chown -R 1000:1000 /app/.next

COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static

COPY --from=builder /app/public ./public

COPY --from=builder /app/howto ./howto

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"] 