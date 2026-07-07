import time
import requests
from agent.collector import get_system_metrics
from agent.screen_share import start_screen_share_thread

def run_agent(config):
    server_url = config.get("server_url")
    agent_id = config.get("agent_id")
    pc_name = config.get("pc_name")
    interval = config.get("interval", 5)

    update_url = f"{server_url.rstrip('/')}/agents/update"

    print(f"Starting agent {pc_name} ({agent_id})")
    print(f"Sending data to {update_url} every {interval} seconds")

    # Start screen sharing thread
    start_screen_share_thread(server_url, agent_id)

    while True:
        try:
            metrics = get_system_metrics()
            payload = {
                "agent_id": agent_id,
                "pc_name": pc_name,
                "cpu_percent": metrics["cpu_percent"],
                "ram_percent": metrics["ram_percent"],
                "disk_percent": metrics["disk_percent"],
                "processes": metrics["processes"],
                "apps": metrics["apps"]
            }
            
            response = requests.post(update_url, json=payload, timeout=5)
            if response.status_code == 200:
                print(f"Data sent successfully: CPU {metrics['cpu_percent']}% | RAM {metrics['ram_percent']}%")
            else:
                print(f"Failed to send data: Status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"Connection error: {e}. Retrying in {interval} seconds...")
            
        time.sleep(interval)
