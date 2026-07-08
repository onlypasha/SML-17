from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict

router = APIRouter()

import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class ConnectionManager:
    def __init__(self):
        self.active_agents: Dict[str, WebSocket] = {}
        self.active_dashboards: Dict[str, list[WebSocket]] = {}

    async def connect_agent(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_agents[agent_id] = websocket
        if agent_id not in self.active_dashboards:
            self.active_dashboards[agent_id] = []

    def disconnect_agent(self, agent_id: str):
        if agent_id in self.active_agents:
            del self.active_agents[agent_id]

    async def connect_dashboard(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        if agent_id not in self.active_dashboards:
            self.active_dashboards[agent_id] = []
        self.active_dashboards[agent_id].append(websocket)

    def disconnect_dashboard(self, agent_id: str, websocket: WebSocket):
        if agent_id in self.active_dashboards:
            if websocket in self.active_dashboards[agent_id]:
                self.active_dashboards[agent_id].remove(websocket)

    async def send_to_agent(self, agent_id: str, message: dict):
        if agent_id in self.active_agents:
            await self.active_agents[agent_id].send_json(message)

    async def send_to_dashboards(self, agent_id: str, message: dict):
        if agent_id in self.active_dashboards:
            for ws in self.active_dashboards[agent_id]:
                await ws.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/agent/{agent_id}")
async def websocket_agent(websocket: WebSocket, agent_id: str):
    await manager.connect_agent(agent_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.send_to_dashboards(agent_id, data)
    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id)

@router.websocket("/ws/dashboard/{agent_id}")
async def websocket_dashboard(websocket: WebSocket, agent_id: str):
    await manager.connect_dashboard(agent_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Intercept mDNS/localhost candidates from browser and replace with real IP
            if data.get("type") == "candidate" and "candidate" in data:
                cand_info = data["candidate"]
                if cand_info and "candidate" in cand_info:
                    cand_str = cand_info["candidate"]
                    if ".local" in cand_str or "127.0.0.1" in cand_str or "127.0.1.1" in cand_str:
                        real_ip = "127.0.0.1"
                        if websocket.client:
                            real_ip = websocket.client.host
                            
                        # If the dashboard connected via localhost, we MUST provide the Agent
                        # with the Server's LAN IP, not localhost!
                        if real_ip in ["127.0.0.1", "localhost", "::1"]:
                            real_ip = get_local_ip()
                            
                        # Now replace if we have a valid LAN IP
                        if real_ip not in ["127.0.0.1", "localhost", "::1"]:
                            parts = cand_str.split(" ")
                            for i, part in enumerate(parts):
                                if ".local" in part or part == "127.0.0.1" or part == "127.0.1.1":
                                    parts[i] = real_ip
                            cand_info["candidate"] = " ".join(parts)
            
            await manager.send_to_agent(agent_id, data)
    except WebSocketDisconnect:
        manager.disconnect_dashboard(agent_id, websocket)
