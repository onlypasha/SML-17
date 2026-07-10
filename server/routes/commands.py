from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import asyncio
import json

from server.models import CommandRequest, BroadcastCommandRequest

router = APIRouter()


class CommandManager:
    """Manages WebSocket connections from agents waiting for commands,
    and a queue of pending commands from the dashboard."""
    
    def __init__(self):
        # agent_id -> WebSocket connection from that agent
        self.agent_connections: Dict[str, WebSocket] = {}
        # agent_id -> list of pending commands (if agent not yet connected)
        self.pending_commands: Dict[str, List[dict]] = {}
        # command_id -> asyncio.Future for waiting on results
        self.result_futures: Dict[str, asyncio.Future] = {}

    async def connect_agent(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        self.agent_connections[agent_id] = websocket
        
        # Send any pending commands
        if agent_id in self.pending_commands:
            for cmd in self.pending_commands[agent_id]:
                await websocket.send_json(cmd)
            del self.pending_commands[agent_id]

    def disconnect_agent(self, agent_id: str):
        self.agent_connections.pop(agent_id, None)

    async def send_command(self, agent_id: str, command: dict) -> dict:
        """Send a command to an agent. Returns the result or error."""
        if agent_id not in self.agent_connections:
            return {
                "success": False,
                "message": f"Agent {agent_id} is not connected to command channel."
            }
        
        ws = self.agent_connections[agent_id]
        try:
            await ws.send_json(command)
            return {"success": True, "message": "Command sent to agent."}
        except Exception as e:
            return {"success": False, "message": f"Failed to send command: {str(e)}"}


command_manager = CommandManager()


@router.websocket("/ws/{agent_id}")
async def command_websocket(websocket: WebSocket, agent_id: str):
    """WebSocket endpoint for agents to connect and receive commands."""
    await command_manager.connect_agent(agent_id, websocket)
    try:
        while True:
            # Agent sends back command results through this channel
            data = await websocket.receive_json()
            # Log the result (could be stored/forwarded to dashboard)
            print(f"Command result from {agent_id}: {data}")
    except WebSocketDisconnect:
        command_manager.disconnect_agent(agent_id)


@router.post("/send")
async def send_command(request: CommandRequest):
    """REST endpoint for dashboard to send a command to an agent."""
    payload = request.payload

    # Prevent localhost loops when Dashboard sends a download URL to the agent
    if request.command == "download_file" and payload and "url" in payload:
        url = payload["url"]
        if "localhost" in url or "127.0.0.1" in url or "::1" in url:
            from server.routes.screen import get_local_ip
            real_ip = get_local_ip()
            url = url.replace("localhost", real_ip).replace("127.0.0.1", real_ip).replace("::1", real_ip)
            payload["url"] = url

    command_data = {
        "command": request.command,
        "payload": payload,
    }
    result = await command_manager.send_command(request.agent_id, command_data)
    return result


@router.post("/broadcast")
async def broadcast_command(request: BroadcastCommandRequest):
    """REST endpoint for dashboard to broadcast a command to ALL connected agents."""
    payload = request.payload

    command_data = {
        "command": request.command,
        "payload": payload,
    }
    
    success_count = 0
    fail_count = 0
    
    agent_ids = list(command_manager.agent_connections.keys())
    tasks = [command_manager.send_command(agent_id, command_data) for agent_id in agent_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for res in results:
        if isinstance(res, dict) and res.get("success"):
            success_count += 1
        else:
            fail_count += 1

    return {
        "success": True, 
        "message": f"Broadcast complete. Sent to {success_count} agents, failed on {fail_count} agents."
    }


@router.post("/stop-service")
async def stop_service(request: CommandRequest):
    """Convenience endpoint to stop a service on an agent."""
    command_data = {
        "command": "stop_service",
        "payload": request.payload,
    }
    result = await command_manager.send_command(request.agent_id, command_data)
    return result


@router.post("/uninstall-app")
async def uninstall_app(request: CommandRequest):
    """Convenience endpoint to uninstall an app on an agent."""
    command_data = {
        "command": "uninstall_app",
        "payload": request.payload,
    }
    result = await command_manager.send_command(request.agent_id, command_data)
    return result


@router.post("/kill-process")
async def kill_process(request: CommandRequest):
    """Convenience endpoint to kill a process on an agent."""
    command_data = {
        "command": "kill_process",
        "payload": request.payload,
    }
    result = await command_manager.send_command(request.agent_id, command_data)
    return result
