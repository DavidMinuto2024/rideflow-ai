# ═══════════════════════════════════════════════════════════
# RideFlow AI — Backend Dockerfile
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
EXPOSE 4000
CMD ["pnpm", "run", "start:dev"]

# ── Production Build ─────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && pnpm run build

# ── Production ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 4000
CMD ["node", "dist/main"]
