1. docker-intro.html에 "📄Dockerfile 작성하기"를 "📄Dockerfile 명령어 모음"으로 변경해줘

2. docker-intro.html 핵심정리 이전에 trouble shooting으로 아래의 오류가 발생할 경우 대처를 작성해줘
```
failed to connect to the docker API at unix:///var/run/docker.sock
dial unix /var/run/docker.sock: connect: no such file or directory
```

발생 원인 : Docker daemon이 실행 중이 아님

```
[devops@localhost fastapi-app]$ sudo systemctl status docker
[sudo] password for devops:
○ docker.service - Docker Application Container Engine
     Loaded: loaded (/usr/lib/systemd/system/docker.service; disabled; preset: disabled)
     Active: inactive (dead)
TriggeredBy: ○ docker.socket
       Docs: https://docs.docker.com
```

```
[devops@localhost fastapi-app]$ sudo systemctl start docker
```

3. docker-practice.html에서는 🔥 실습: 방문자 카운터에 관한 예제를 아래의 내용으로 변경해줘

docker-compose.yaml
```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: always
```

Dockerfile
```
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

requirements.txt
```
fastapi
uvicorn[standard]
redis
```

```python
import os

from fastapi import FastAPI
from redis import Redis

app = FastAPI()

redis_client = Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True,
)

VISITOR_COUNT_KEY = "visitor_count"


@app.get("/")
def count_visitor():
    count = redis_client.incr(VISITOR_COUNT_KEY)

    return {
        "message": "Hello FastAPI + Redis!",
        "visitor_count": count,
    }


@app.get("/count")
def get_count():
    count = redis_client.get(VISITOR_COUNT_KEY) or 0

    return {
        "visitor_count": int(count),
    }


@app.delete("/count")
def reset_count():
    redis_client.delete(VISITOR_COUNT_KEY)

    return {
        "message": "Visitor count reset",
        "visitor_count": 0,
    }
```

```bash
[devops@localhost fastapi-redis-counter]$ docker compose up -d
[+] up 2/2
 ✔ Container fastapi-redis-counter-redis-1 Started                                                          0.2s
 ✔ Container fastapi-redis-counter-app-1   Started                                                          0.3s
```

```bash
[devops@localhost fastapi-redis-counter]$ docker compose ps
NAME                            IMAGE                       COMMAND                  SERVICE   CREATED         S                                                                     TATUS         PORTS
fastapi-redis-counter-app-1     fastapi-redis-counter-app   "uvicorn main:app --…"   app       7 minutes ago   U                                                                     p 4 seconds   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp
fastapi-redis-counter-redis-1   redis:7-alpine              "docker-entrypoint.s…"   redis     7 minutes ago   U                                                                     p 4 seconds   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
```

```bash
[devops@localhost fastapi-redis-counter]$ docker compose ps
NAME                            IMAGE                       COMMAND                  SERVICE   CREATED         STATUS         PORTS
fastapi-redis-counter-app-1     fastapi-redis-counter-app   "uvicorn main:app --…"   app       7 minutes ago   Up 7 seconds   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp
fastapi-redis-counter-redis-1   redis:7-alpine              "docker-entrypoint.s…"   redis     7 minutes ago   Up 7 seconds   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
```

```bash
[devops@localhost fastapi-redis-counter]$ docker compose down
[+] down 3/3
 ✔ Container fastapi-redis-counter-app-1   Removed                                                                                                                               0.5s
 ✔ Container fastapi-redis-counter-redis-1 Removed                                                                                                                               0.3s
 ✔ Network fastapi-redis-counter_default   Removed                                                                                                                               0.1s
```

```bash
[devops@localhost fastapi-redis-counter]$ docker compose ps
NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS
```