FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api-node/package.json apps/api-node/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY shared/package.json shared/package.json
RUN npm ci --workspace apps/api-node --include-workspace-root

COPY apps/api-node apps/api-node
RUN npm run build:api \
  && cp apps/api-node/src/migrations/*.sql apps/api-node/dist/migrations/ \
  && npm prune --workspace apps/api-node --include-workspace-root --omit=dev

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api-node/package.json ./apps/api-node/package.json
COPY --from=build /app/apps/api-node/dist ./apps/api-node/dist

USER node
EXPOSE 3001
CMD ["node", "apps/api-node/dist/server.js"]
