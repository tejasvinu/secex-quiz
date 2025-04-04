# Use an official Node runtime as a parent image with specific version
FROM node:18.20.0-alpine

# Set the working directory
WORKDIR /app/backend

# Copy package files first for better caching
COPY package*.json ./

# First install the specific package we're having trouble with
RUN npm install @google/generative-ai

# Then install all other dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Define the command to run the app
CMD ["npm", "start"]