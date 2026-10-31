# Étape 1 : build statique Astro
FROM node:22.20.0-alpine AS build
WORKDIR /app
RUN apk add --no-cache fontconfig ttf-dejavu
COPY site/package.json site/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY site/ .
ARG PUBLIC_SITE_ENV=preprod
ARG SITE_URL=https://techformanord.fr
ARG PUBLIC_ANALYTICS_PROVIDER=
ARG PUBLIC_ANALYTICS_ID=
ARG PUBLIC_ANALYTICS_DOMAIN=techformanord.fr
ARG PUBLIC_GSC_VERIFICATION=
ENV PUBLIC_SITE_ENV=$PUBLIC_SITE_ENV SITE_URL=$SITE_URL PUBLIC_ANALYTICS_PROVIDER=$PUBLIC_ANALYTICS_PROVIDER \
    PUBLIC_ANALYTICS_ID=$PUBLIC_ANALYTICS_ID PUBLIC_ANALYTICS_DOMAIN=$PUBLIC_ANALYTICS_DOMAIN PUBLIC_GSC_VERIFICATION=$PUBLIC_GSC_VERIFICATION \
    ASTRO_TELEMETRY_DISABLED=1
RUN npm run build

# Étape 2 : service nginx
FROM nginx:1.28.0-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Version livrée, vérifiable à distance (/version.txt).
ARG GIT_COMMIT=dev
RUN echo "$GIT_COMMIT" > /usr/share/nginx/html/version.txt
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/legacy-rules.inc /etc/nginx/conf.d/legacy-rules.inc
RUN rm -f /etc/nginx/conf.d/default.conf
ENV NGINX_ROBOTS_HEADER="noindex, nofollow" NGINX_ENVSUBST_FILTER="NGINX_"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
