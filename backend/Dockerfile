FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create database directory
RUN mkdir -p /app/database

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]

