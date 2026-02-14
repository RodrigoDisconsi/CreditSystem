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

COPY pnpm-workspace.yaml .npmrc ./
COPY package.json pnpm-lock.yaml ./

COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage: development
# =============================================================================
FROM dependencies AS development

COPY packages/shared/ ./packages/shared/
COPY apps/frontend/ ./apps/frontend/
COPY tsconfig.base.json ./

EXPOSE 5173

CMD ["pnpm", "--filter", "@credit-system/frontend", "dev", "--host", "0.0.0.0"]

# =============================================================================
# Stage: build
# =============================================================================
FROM development AS build

ARG VITE_API_URL=http://localhost:3000

ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter @credit-system/shared build && \
    pnpm --filter @credit-system/frontend build

# =============================================================================
# Stage: production
# =============================================================================
FROM nginx:alpine AS production

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
