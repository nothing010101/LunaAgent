# =============================================================================
# LUNA Agent — Dockerfile for Railway (24/7 seller runtime)
# =============================================================================

FROM node:20-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy source
COPY tsconfig.json ./
COPY bin/ ./bin/
COPY src/ ./src/

# Ensure offerings directory exists (populated at build or via volume)
RUN mkdir -p src/seller/offerings

# Default command: run seller runtime directly (no daemonization needed in containers)
CMD ["npx", "tsx", "src/seller/runtime/seller.ts"]
