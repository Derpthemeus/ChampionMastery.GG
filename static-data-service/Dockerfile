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
RUN apt-get update && apt-get install -y libjemalloc2
ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2
COPY --from=build cmgg/js/ js/
COPY package.json ./
COPY package-lock.json ./
# Install only runtime dependencies.
RUN npm install --only=prod
COPY static static/

EXPOSE 8080
ENTRYPOINT ["node", "js/server.js"]
