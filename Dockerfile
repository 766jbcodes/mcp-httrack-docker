# -------------------------------------------------------------------------- #
# Dockerfile for HTTrack-MCP                                                 #
# Builds a lightweight production image that includes the HTTrack CLI.      #
# -------------------------------------------------------------------------- #

# ----- Build stage -------------------------------------------------------- #
FROM node:20-slim AS builder

# Install HTTrack (required at runtime too)
RUN apt-get update && \
    apt-get install -y --no-install-recommends httrack && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy only the package metadata first for faster rebuilds
COPY package*.json tsconfig.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY src ./src
RUN npm run build

# ----- Runtime stage ------------------------------------------------------ #
FROM node:20-slim

# Install HTTrack in the runtime image
RUN apt-get update && \
    apt-get install -y --no-install-recommends httrack && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HTTRACK_MCP_PORT=3000

# Copy built files and production dependencies
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Create downloads directory (will be replaced by volume at runtime)
RUN mkdir -p downloads

EXPOSE 3000 8080

CMD ["node", "dist/server.js"] 