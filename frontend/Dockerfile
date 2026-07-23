# ═══════════════════════════════════════════════════════════
# RideFlow AI — Frontend Dockerfile
#
# Multi-stage: development (fast rebuild) + production (small image)
# ═══════════════════════════════════════════════════════════

# ── Base ─────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependencies ─────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Development ──────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# ── Production Build ─────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ── Production ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.js ./
EXPOSE 3000
CMD ["pnpm", "run", "start"]
