ARG NODE_VERSION=20.11.1
FROM node:${NODE_VERSION}-slim as base
FROM base as build

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Build your app
RUN npm run build

# Stage 2: Serve the app using Express
FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Copy the built app from the previous stage
COPY --from=build /app/build /app/build

# Copy package.json and server file
COPY package*.json ./
COPY server.js .

# Install only production dependencies
RUN npm install --only=production

# Your app binds to port 3000 so you'll use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 3000

CMD ["node", "server.js"]
