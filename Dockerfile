# Use Ubuntu-based Node.js image instead of Alpine
FROM node:20-bullseye AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y libc6
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="file:./prisma/dev.db"

# Generate Prisma client
RUN npx prisma generate

# Build the application with more memory allocation
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./dev.db"

# Create a non-root user with home directory
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --create-home nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for runtime dependencies
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Set npm cache to writable directory
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV HOME=/home/nextjs

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/healthcheck || exit 1

# Run Prisma migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]