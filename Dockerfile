FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci --no-audit --no-fund && npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:24-alpine
WORKDIR /app
ARG BUILD_COMMIT=unversioned
LABEL org.opencontainers.image.revision=$BUILD_COMMIT
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 SITE_RELEASE=$BUILD_COMMIT
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/server.mjs /app/package.json ./
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
