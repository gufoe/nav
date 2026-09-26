# UI static build — build context is the repo root (workspace ui + shared).
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY ui/package.json ./ui/
COPY backend/package.json ./backend/

RUN npm ci --workspace nav-ui --include-workspace-root

COPY shared ./shared
COPY ui ./ui

RUN npm run build -w nav-ui

FROM alpine:3.20

RUN apk add --no-cache ca-certificates python3 \
  && adduser -D noob

WORKDIR /home/noob
COPY --from=builder /app/ui/dist ./static

USER noob
EXPOSE 8080
CMD ["python3", "-m", "http.server", "8080", "-d", "/home/noob/static"]
