FROM traefik:v3.7

ENTRYPOINT ["/custom_entrypoint.sh"]

COPY ./custom_entrypoint.sh /custom_entrypoint.sh
RUN ["chmod", "+x", "/custom_entrypoint.sh"]
COPY ./file_provider.yml /etc/traefik/file_provider.yml
COPY ./traefik.yml /etc/traefik/traefik.yml
