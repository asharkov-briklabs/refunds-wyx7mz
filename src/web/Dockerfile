# Build stage: Compiles the React application
FROM node:18-alpine as build

# Set working directory for all build operations
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies with clean installation
# npm ci is preferred in CI/CD environments as it's more strict and consistent
RUN npm ci

# Copy all application source files
COPY . .

# Set build arguments for environment configuration
# These values can be provided at build time with --build-arg
ARG REACT_APP_API_URL
ARG REACT_APP_AUTH_DOMAIN
ARG REACT_APP_AUTH_CLIENT_ID

# Set environment to production for optimized build
ENV NODE_ENV=production

# Build the application to /app/build
RUN npm run build

# Production stage: Serves the built application
FROM nginx:1.27-alpine

# Copy custom nginx configuration for handling React routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from the build stage to nginx's serving directory
COPY --from=build /app/build /usr/share/nginx/html

# Set proper ownership and permissions for security
# nginx user needs read permissions, directories need execute permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user for better security
USER nginx

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]