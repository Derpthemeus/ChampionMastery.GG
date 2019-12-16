#!/bin/sh

# Setup the ACME storage directory
mkdir -p /acme
touch /acme/acme-production.json
touch /acme/acme-staging.json
chmod -R 600 /acme/

traefik "$@"
