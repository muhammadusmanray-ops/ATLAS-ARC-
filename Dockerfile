# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy all source files
COPY . .

# Build the React frontend
RUN npm run build

# Expose HuggingFace Spaces default port
EXPOSE 7860

# Set production environment
ENV NODE_ENV=production
ENV PORT=7860

# Start the server (serves both API + built frontend)
CMD ["npx", "tsx", "server.ts"]
