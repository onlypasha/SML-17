import json
import os
import uuid

CONFIG_FILE = "config.json"

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return None

def save_config(server_url, pc_name, interval):
    agent_id = str(uuid.uuid4())
    config = {
        "agent_id": agent_id,
        "server_url": server_url,
        "pc_name": pc_name,
        "interval": interval
    }
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)
    return config
