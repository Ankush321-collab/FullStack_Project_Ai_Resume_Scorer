FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx turbo run build --filter=matcher

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
CMD ["npm", "run", "dev", "--workspace=services/matcher"]
