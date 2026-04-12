# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (only production if needed, but we need tsx)
RUN npm install

# Copy source code
COPY . .

# Expose the port Hugging Face expects
EXPOSE 7860

# Set production environment
ENV NODE_ENV=production
ENV PORT=7860

# Run the server (Backend Only)
# We use tsx because we are using .ts files directly
CMD ["npx", "tsx", "server.ts"]
