FROM node:gallium AS build
WORKDIR /cmgg
COPY tsconfig.json ./
COPY package.json ./
COPY package-lock.json ./
# Install all dependencies for compilation.
RUN npm install
COPY ts/ ts/
RUN npm run compile

FROM node:gallium AS run
WORKDIR /cmgg
COPY --from=build cmgg/js/ js/
COPY package.json ./
COPY package-lock.json ./
# Install only runtime dependencies.
RUN npm install --only=prod
COPY locales/ locales/
COPY public/ public/

EXPOSE 8080
ENTRYPOINT ["node", "js/server.js"]
