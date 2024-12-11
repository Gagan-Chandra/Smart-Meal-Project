# Use Node.js as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Install necessary packages, including netcat (nc)
RUN apt-get update && apt-get install -y netcat-openbsd

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Rebuild bcrypt for the container environment
RUN npm rebuild bcrypt --build-from-source

# Copy the rest of the application
COPY . .

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
