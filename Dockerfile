# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend for production
RUN npm run build

# Expose the port Hugging Face expects
EXPOSE 7860

# Set production environment
ENV NODE_ENV=production
ENV PORT=7860

# Run the server
CMD ["npx", "tsx", "server.ts"]
