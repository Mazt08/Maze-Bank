FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
