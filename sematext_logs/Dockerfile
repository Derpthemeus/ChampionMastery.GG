FROM sematext/logagent

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/run.sh", "--config", "/config.yml"]

COPY config.yml /config.yml
COPY patterns.yml /etc/logagent/patterns.yml
