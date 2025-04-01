# filepath: c:\Users\tejasv\Documents\secex-quiz\frontend\Dockerfile
# Stage 1: Build the React application
FROM node:18-alpine AS build
WORKDIR /app/frontend

COPY package*.json ./
RUN npm install

COPY . .
# Make sure the API URL points to the backend service in Docker Compose
# If your backend is exposed on host port 5000, keep localhost:5000
# If deploying elsewhere, adjust VITE_API_URL accordingly
# For this compose setup, assuming access via host's localhost:5000
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default Nginx static assets
RUN rm -rf ./*

# Copy static assets from builder stage
COPY --from=build /app/frontend/dist .

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]