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
