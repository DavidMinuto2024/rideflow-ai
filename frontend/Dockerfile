# ═══════════════════════════════════════════════════════════
# RideFlow AI — Frontend Dockerfile
#
# Multi-stage: development (fast rebuild) + production (small image)
# ═══════════════════════════════════════════════════════════

# ── Base ─────────────────────────────────────────────────
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# ── Dependencies ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Development ──────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Production Build ─────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Production ───────────────────────────────────────────
FROM node:22-slim AS production
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.js ./
EXPOSE 3000
CMD ["npm", "run", "start"]
