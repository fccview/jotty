FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache su-exec

RUN if ! getent group 1000 > /dev/null 2>&1; then \
        addgroup --system --gid 1000 appgroup; \
    fi

RUN if ! getent passwd 1000 > /dev/null 2>&1; then \
        GROUP_NAME=$(getent group 1000 | cut -d: -f1); \
        adduser --system --uid 1000 --gid "$GROUP_NAME" appuser; \
    fi

# Create data directory with proper permissions
RUN mkdir -p /app/data/users /app/data/checklists /app/data/notes && \
    chown -R 1000:1000 /app/data

# Create .next cache directory with proper permissions
RUN mkdir -p /app/.next/cache && \
    chown -R 1000:1000 /app/.next

# Copy public directory
COPY --from=builder /app/public ./public

# Copy the howto directory
COPY --from=builder /app/howto ./howto

# Copy the entire .next directory
COPY --from=builder --chown=1000:1000 /app/.next ./.next

# Copy package.json and yarn.lock for yarn start
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# Copy node_modules for production dependencies
COPY --from=deps --chown=1000:1000 /app/node_modules ./node_modules

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["yarn", "start"] 