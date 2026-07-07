from fastapi import APIRouter
from server.models import AgentMetrics
from server.store import update_agent_data, get_all_agents

router = APIRouter()

@router.post("/update")
async def update_agent(metrics: AgentMetrics):
    update_agent_data(metrics.agent_id, metrics.model_dump())
    return {"message": "Data updated successfully"}

@router.get("/")
async def get_agents():
    return get_all_agents()
