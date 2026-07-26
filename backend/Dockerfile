# ═══════════════════════════════════════════════════════════
# RideFlow AI — Backend Dockerfile
#
# Single-stage build for production. Simpler than multi-stage.
# ═══════════════════════════════════════════════════════════

FROM node:22-slim
WORKDIR /app

# Install runtime deps (openssl for Prisma)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies (npm ci respects package-lock.json)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 4000
# Diagnostic: check dist exists, then run the app
CMD ls -la /app/dist/ 2>&1; echo '---'; ls -la /app/dist/main* 2>&1; echo '---'; node /app/dist/main
