FROM node:22.20.0-alpine
WORKDIR /app/lms
COPY lms/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p /data && chown node:node /data
COPY --chown=node:node lms/*.mjs lms/style.css lms/browser.js ./
COPY --chown=node:node lms/migrations ./migrations
COPY --chown=node:node site/src/data/trainingforme.json /app/site/src/data/trainingforme.json
ENV LMS_DB=/data/trainingforme.sqlite LMS_BIND=0.0.0.0 PORT=4330
USER node
EXPOSE 4330
CMD ["node","server.mjs"]
