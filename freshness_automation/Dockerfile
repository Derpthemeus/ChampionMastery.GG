FROM python

COPY requirements.txt ./
COPY get_top_players.sql ./
COPY top_players_updater.py ./
RUN python -m pip install -r requirements.txt
ENTRYPOINT ["python3", "-u", "top_players_updater.py"]
