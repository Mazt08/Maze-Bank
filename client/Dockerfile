FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application
COPY . .

# Build React app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the app
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start server
CMD ["serve", "-s", "build", "-l", "3000"]
