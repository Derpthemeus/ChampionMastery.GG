import docker
import requests
from time import sleep

client = docker.from_env()

print("Started")

while True:
    try:
        requests.get("http://highscores_service:8181", timeout=5)
    # TODO this should be scoped more tightly to only catch timeouts
    except:
        container = client.containers.get("cmgg-highscores_service-1")
        container.restart()
        print("Restarted highscores service")
    sleep(60)
