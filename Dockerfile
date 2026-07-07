# Stage 1: Build React Dashboard
FROM node:20-alpine AS build-stage
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ ./
RUN npm run build

# Stage 2: Serve with FastAPI
FROM python:3.11-slim
WORKDIR /app
# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir fastapi uvicorn pydantic websockets

# Copy server and built dashboard
COPY server/ ./server/
COPY --from=build-stage /app/dashboard/dist/ ./dashboard/dist/

EXPOSE 8000
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
