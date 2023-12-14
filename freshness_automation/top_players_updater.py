#!/bin/python
import mysql.connector
import os
import time
import urllib.parse
import urllib.request


with mysql.connector.connect(
    host=os.environ["MYSQL_HOST"],
    user=os.environ["MYSQL_USER"],
    password=os.environ["MYSQL_PASSWORD"]
) as conn:
    with open("./get_top_players.sql") as script:
        with conn.cursor() as cursor:
            cursor.execute(script.read(), multi=True)

    # TODO this is janky, why do we need to reconnect?
    conn.reconnect()
    with conn.cursor() as cursor:
        cursor.execute("CALL cmgg.get_top_players()")
        rows = cursor.fetchall()
for row in rows:
    platform = row[1]
    puuid = row[2]
    url = "%s/refreshPlayer?puuid=%s&platform=%s" % (os.environ["HIGHSCORES_SERVICE_URL"], urllib.parse.quote(puuid), platform)
    print("Making request to %s" % (url))
    try:
        urllib.request.urlopen(url).read()
    except Exception as ex:
        print("Error for %s: %s" % (url, ex))
    time.sleep(1)
