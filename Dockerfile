# Build stage
FROM oven/bun:1 AS build-stage
WORKDIR /app
COPY package.json bun.lock* ./
# Install dependencies
RUN bun install
COPY . .
# Run build (excluding manifest generation to avoid overwriting with empty)
RUN bun run build

# Production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
