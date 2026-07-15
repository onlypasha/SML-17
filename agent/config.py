import json
import os
import sys
import uuid

def get_config_path():
    appdata = os.environ.get('APPDATA')
    if appdata:
        dir_path = os.path.join(appdata, 'SML17_Agent')
    else:
        dir_path = os.path.join(os.path.expanduser('~'), '.sml17_agent')
    
    os.makedirs(dir_path, exist_ok=True)
    return os.path.join(dir_path, 'config.json')

CONFIG_FILE = get_config_path()

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
