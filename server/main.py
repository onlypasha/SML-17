from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.routes import agents, files, screen, commands

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
app.include_router(commands.router, prefix="/commands", tags=["commands"])

import os
import sys
from fastapi.staticfiles import StaticFiles

def get_dist_path():
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, "dashboard", "dist")

dist_path = get_dist_path()

if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="dashboard")
else:
    @app.get("/")
    async def root():
        return {"message": "SML-17 Server is running. Dashboard is not built."}
