# Stage 1: Build
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the NestJS application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the built application from the build stage
COPY --from=build /app/dist ./dist

# Copy other necessary files (e.g., configurations)
COPY --from=build /app/.env ./

# Expose the application port (replace with your app's port if different)
EXPOSE 3000

# Set the command to start the application
CMD ["node", "dist/main"]
