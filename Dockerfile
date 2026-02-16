FROM oven/bun:1 AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install
COPY frontend/ .
RUN bun run build

FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends caddy && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/sqldef/sqldef/releases/download/v3.9.4/psqldef_linux_amd64.tar.gz', '/tmp/p.tar.gz')" \
    && tar xzf /tmp/p.tar.gz -C /usr/local/bin/ psqldef && rm /tmp/p.tar.gz
COPY backend/ ./backend/
COPY --from=frontend-build /app/dist ./static/
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
CMD ["sh", "-c", "caddy run --config /etc/caddy/Caddyfile & cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info"]
