from pydantic import BaseModel
from typing import List, Optional

class ProcessInfo(BaseModel):
    pid: int
    name: str
    status: str

class AppInfo(BaseModel):
    name: str
    version: str

class AgentMetrics(BaseModel):
    agent_id: str
    pc_name: str
    cpu_percent: float
    ram_percent: float
    disk_percent: float
    processes: Optional[List[ProcessInfo]] = []
    apps: Optional[List[AppInfo]] = []

class AgentStatus(BaseModel):
    agent_id: str
    status: str

# --- Command models ---

class StopServiceCommand(BaseModel):
    agent_id: str
    service_name: str

class UninstallAppCommand(BaseModel):
    agent_id: str
    app_name: str

class CommandRequest(BaseModel):
    """Generic command sent from dashboard to agent via server."""
    agent_id: str
    command: str  # "stop_service", "uninstall_app", "kill_process"
    payload: dict = {}

class BroadcastCommandRequest(BaseModel):
    """Generic command sent from dashboard to ALL connected agents via server."""
    command: str
    payload: dict = {}

class CommandResult(BaseModel):
    """Result sent back from agent after executing a command."""
    agent_id: str
    command: str
    success: bool
    message: str = ""
