# Build context is the repository root so Coolify can share it with the frontend.
# Every COPY path below is therefore relative to the repo root, not to server/.
FROM node:22-alpine AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json server/package-lock.json server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
# tsconfig.build.json drops src/**/__tests__, so no test code reaches the image.
RUN npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Migrations ship with the image so `drizzle-kit migrate` can run from a shell
# in the running container without rebuilding.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server/package.json ./package.json
COPY server/migrations ./migrations

# node:alpine already provides an unprivileged `node` user.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
