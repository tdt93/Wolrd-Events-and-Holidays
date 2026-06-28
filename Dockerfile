FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache nodejs curl wget

WORKDIR /app

COPY server/index.js server/geocodeProxy.js server/apiFootball.js ./server/
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/geo /usr/share/nginx/html/geo

RUN nginx -t

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1/health | grep -q ok || exit 1

CMD ["/start.sh"]
