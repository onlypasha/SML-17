from typing import Dict, Any
import time

# In-memory storage for agents
agents_data: Dict[str, Any] = {}

def update_agent_data(agent_id: str, data: dict):
    data['last_seen'] = time.time()
    agents_data[agent_id] = data

def get_all_agents() -> Dict[str, Any]:
    # Update status online/offline based on last_seen
    current_time = time.time()
    for agent_id, data in agents_data.items():
        # If last seen was more than 30 seconds ago, consider offline
        if current_time - data.get('last_seen', 0) > 30:
            agents_data[agent_id]['status'] = 'offline'
        else:
            agents_data[agent_id]['status'] = 'online'
    return agents_data
