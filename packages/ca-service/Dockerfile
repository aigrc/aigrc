# CGA Certificate Authority Service
# Production Docker image

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/ca-service/package.json packages/ca-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/core packages/core
COPY packages/ca-service packages/ca-service
COPY tsconfig.json ./

# Build packages
RUN pnpm --filter @aigrc/core build
RUN pnpm --filter @aigrc/ca-service build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 aigrc

# Copy built files
COPY --from=builder /app/packages/ca-service/dist ./dist
COPY --from=builder /app/packages/ca-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /app/data && chown -R aigrc:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV CA_PORT=3000
ENV CA_HOST=0.0.0.0
ENV CA_DB_PATH=/app/data/cga-ca.db
ENV CA_LOG_LEVEL=info

# Switch to non-root user
USER aigrc

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start server
CMD ["node", "dist/bin/server.js"]
