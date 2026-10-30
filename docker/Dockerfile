FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG APP
# Chỉ generate Prisma client nếu app có schema. DIRECT_URL giả chỉ để config nạp được lúc build.
RUN if [ -f apps/$APP/prisma/schema.prisma ]; then \
      DIRECT_URL="postgresql://build:build@localhost:5432/build" \
      npx prisma generate --config apps/$APP/prisma.config.ts; \
    fi
RUN npx nest build $APP

FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ARG APP
ENV APP=$APP
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
CMD node dist/apps/$APP/main.js
