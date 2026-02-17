# =============================================================================
# Stage: base
# =============================================================================
FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# =============================================================================
# Stage: dependencies
# =============================================================================
FROM base AS dependencies

# Copy workspace configuration
COPY pnpm-workspace.yaml .npmrc ./
COPY package.json pnpm-lock.yaml ./

# Copy package.json files for all workspace packages
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage: development
# =============================================================================
FROM dependencies AS development

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/
COPY tsconfig.base.json ./

# Generate Prisma client
RUN pnpm --filter @credit-system/backend exec prisma generate

EXPOSE 3000

CMD ["pnpm", "--filter", "@credit-system/backend", "dev"]

# =============================================================================
# Stage: build
# =============================================================================
FROM development AS build

# Build shared package first, then backend
RUN pnpm --filter @credit-system/shared build && \
    pnpm --filter @credit-system/backend build

# =============================================================================
# Stage: production
# =============================================================================
FROM base AS production

ENV NODE_ENV=production

COPY pnpm-workspace.yaml .npmrc ./
COPY package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema and generate client
COPY apps/backend/prisma ./apps/backend/prisma
RUN pnpm --filter @credit-system/backend exec prisma generate

# Copy built artifacts
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000

CMD ["node", "apps/backend/dist/main.js"]
