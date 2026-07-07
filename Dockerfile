FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir fastapi uvicorn pydantic websockets

# Copy server and built dashboard
COPY server/ ./server/
COPY dashboard/dist/ ./dashboard/dist/

EXPOSE 8000

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
