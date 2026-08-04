# Stage 1 — build the docs site. It ships inside the same container as the
# app, so /docs and /<server>/docs can never drift from the deployment
# they describe.
FROM node:22-alpine AS docs
WORKDIR /docs
COPY docs/package*.json ./
RUN npm ci
COPY docs ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY --from=docs /docs/build ./docs/build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/index.mjs"]
