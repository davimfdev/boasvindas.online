# Frontend (boasvindas-site): builds the Vite SPA and serves /dist with nginx.
# Build context is the repository root, shared with server/Dockerfile.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app

# Public URL of the API. Empty is correct in production: Nginx Proxy Manager
# serves the site and /api/ on the same domain, so relative paths already work
# and the session cookie stays first-party. Never a secret — VITE_* is inlined
# into the bundle and shipped to the browser.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts vitest.setup.ts postcss.config.mjs index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:1.29-alpine AS runtime

# SPA fallback, asset caching and gzip. Replaces the stock default server block.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
