# Lightweight Node.js 20 base image
FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies for both backend and frontend
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy application source files
COPY . .

# Build frontend SPA dist bundle
RUN cd frontend && npm run build

# Expose Railway default port
EXPOSE 5000

ENV NODE_ENV=production

# Start CampusConnect server
CMD ["node", "backend/server.js"]
