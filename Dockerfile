# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 build-essential \
 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/data/uploads \
 && useradd -r -u 1001 -g root modsblox \
 && chown -R modsblox:root /app

COPY --from=deps --chown=modsblox:root /app/node_modules ./node_modules
COPY --chown=modsblox:root . .

USER modsblox
ENV DATA_DIR=/app/data
VOLUME ["/app/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","server.js"]
