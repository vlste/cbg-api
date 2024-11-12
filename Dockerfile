FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY .env.production .env
COPY static ./static

# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# USER appuser
# EXPOSE 3030

CMD ["node", "dist/index.js"]