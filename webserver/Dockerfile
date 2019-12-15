FROM node:carbon AS build
WORKDIR /cml
COPY tsconfig.json ./
COPY package.json ./
COPY package-lock.json ./
# Install all dependencies for compilation.
RUN npm install
COPY ts/ ts/
RUN npm run compile

FROM node:carbon AS run
WORKDIR /cml
COPY --from=build cml/js/ js/
COPY package.json ./
COPY package-lock.json ./
# Install only runtime dependencies.
RUN npm install --only=prod
COPY views/ views/
COPY public/ public/

EXPOSE 8080
ENTRYPOINT ["node", "js/server.js"]
