# filepath: c:\Users\tejasv\Documents\secex-quiz\backend\Dockerfile
# Use an official Node runtime as a parent image
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app/backend

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Define the command to run the app
CMD ["npm", "start"]