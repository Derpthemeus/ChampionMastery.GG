FROM python

COPY requirements.txt ./
COPY healthcheck.py ./
RUN python -m pip install -r requirements.txt
ENTRYPOINT ["python3", "-u", "healthcheck.py"]
