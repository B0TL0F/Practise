# Build
FROM node:24-slim
WORKDIR /app
COPY ./services/orders ./services/orders
COPY lib lib
EXPOSE 4002
CMD ["node", "services/orders/server.mjs"]