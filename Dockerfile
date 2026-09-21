# ─── chat.drs.bot — production Docker image ────────────────────────────────
# Build:  docker build -t chat-drs-bot .
# Run:    docker run -p 3000:3000 -e AUTH_SECRET=$(openssl rand -base64 32) chat-drs-bot

FROM node:22-bookworm-slim AS builder

# Build tools for native modules (better-sqlite3) fallback if prebuilds unavailable
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN DOCKER_BUILD=1 npx next build


FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server output (includes traced node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# SQLite database lives in a volume for persistence
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db
VOLUME ["/app/db"]

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
