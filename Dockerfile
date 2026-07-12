# FinFlow — single-container deployment.
# Build from the repo root:  docker build -t finflow .
# Run with a persistent volume for the SQLite database:
#   docker run -p 3000:3000 -v finflow-data:/app/data \
#     -e APP_PASSWORD=... -e ANTHROPIC_API_KEY=... finflow

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY app/ .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app ./
# The sql.js database file lives here — mount a volume to keep it
VOLUME /app/data
EXPOSE 3000
CMD ["pnpm", "start"]
