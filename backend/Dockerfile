# API — build context is the repo root.
FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY ui/package.json ./ui/

RUN npm ci --workspace nav-backend --include-workspace-root --omit=dev \
  && npm rebuild better-sqlite3 -w nav-backend

COPY shared ./shared
COPY backend ./backend

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3001
ENV NAV_DB_PATH=/data/nav.db

EXPOSE 3001

CMD ["node", "--import", "tsx", "src/index.ts"]
