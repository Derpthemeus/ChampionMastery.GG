FROM grafana/grafana:6.5.2

COPY /datasources.yml /etc/grafana/provisioning/datasources/
COPY /dashboards.yml /etc/grafana/provisioning/dashboards/
COPY /notifiers.yml /etc/grafana/provisioning/notifiers/
COPY /grafana.ini /etc/grafana/

RUN grafana-cli plugins install grafana-piechart-panel

COPY /dashboards /grafana_dashboards
