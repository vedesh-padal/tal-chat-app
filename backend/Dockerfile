<<<<<<< HEAD
# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Command to run the app
=======
FROM node:18-alpine

WORKDIR /usr/src/talchat-backend

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

>>>>>>> dockerizing-1
CMD ["npm", "start"]
