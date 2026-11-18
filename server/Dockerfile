# syntax=docker/dockerfile:1
# Build context: repository root. Targets: dev (bun --watch, HMR client) and runtime (prebuilt client, production deps).
# The base image tag is multi-arch (linux/amd64 and linux/arm64).
ARG BUN_IMAGE=oven/bun:1.4.2-alpine

FROM ${BUN_IMAGE} AS manifests
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

FROM manifests AS deps
RUN bun install --frozen-lockfile

FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
# The named volume copies this directory's owner on first mount, so the non-root user can write the SQLite file.
RUN mkdir -p /data && chown bun:bun /data
USER bun
EXPOSE 3000
CMD ["bun", "--watch", "server/src/main.ts"]

FROM deps AS build
COPY tsconfig.base.json ./
COPY shared shared
COPY client client
RUN cd client && bun run build

FROM manifests AS prod-deps
RUN bun install --frozen-lockfile --production

FROM ${BUN_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Bun's isolated installs keep the package store in /app/node_modules/.bun and link each workspace's
# dependencies into that workspace's own node_modules, so all three are needed.
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/shared/node_modules shared/node_modules
COPY --from=prod-deps /app/server/node_modules server/node_modules
COPY package.json bunfig.toml ./
COPY shared/package.json shared/
COPY shared/src shared/src
COPY server/package.json server/
COPY server/src server/src
COPY server/migrations server/migrations
COPY --from=build /app/client/dist/public client/dist/public
RUN mkdir -p /data && chown bun:bun /data
USER bun
EXPOSE 3000
CMD ["bun", "server/src/main.ts"]
