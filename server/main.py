from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.routes import agents, files, screen

app = FastAPI(title="SML-17 Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(screen.router, prefix="/screen", tags=["screen"])

import os
from fastapi.staticfiles import StaticFiles

if os.path.exists("dashboard/dist"):
    app.mount("/", StaticFiles(directory="dashboard/dist", html=True), name="dashboard")
else:
    @app.get("/")
    async def root():
        return {"message": "SML-17 Server is running. Dashboard is not built."}
