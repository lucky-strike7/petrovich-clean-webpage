FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS assets
COPY scripts/build.mjs scripts/check-build.mjs ./scripts/
COPY index.html 404.html robots.txt sitemap.xml site.webmanifest favicon.svg favicon.ico favicon-32.png apple-touch-icon.png icon-192.png icon-512.png ./
COPY fresh ./fresh
COPY fonts ./fonts
COPY Video ./Video
COPY cases ./cases
COPY privacy ./privacy
COPY consent ./consent
RUN npm run build && npm run verify:build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-alpine
WORKDIR /app
ARG BUILD_COMMIT=unversioned
LABEL org.opencontainers.image.revision=$BUILD_COMMIT ru.petrovichbrothers.component=clean-website-runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 SITE_RELEASE=$BUILD_COMMIT
COPY --from=assets --chown=node:node /app/dist ./dist
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server ./server
COPY --chown=node:node server.mjs package.json ./
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
