FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
