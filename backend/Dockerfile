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
# DEBUG: Test if Node.js runs at all
CMD ["node", "-e", "console.log('RideFlow container OK v' + process.version); setInterval(() => {}, 60000)"]
