FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY src/ .
COPY node_modules/ ./node_modules

# Run app
EXPOSE 3000
CMD [ "node", "server" ]