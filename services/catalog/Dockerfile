# Build
FROM node:24-slim
WORKDIR /app
COPY ./services/catalog ./services/catalog
COPY lib lib
EXPOSE 4001
CMD ["node", "services/catalog/server.mjs"]