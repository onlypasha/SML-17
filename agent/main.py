import sys
import os

# Add parent directory to path so agent can import local modules 
# properly when run directly from agent/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.config import load_config
from agent.gui import run_gui
from agent.agent import run_agent

def main():
    config = load_config()
    
    if not config:
        print("Configuration not found. Starting GUI setup...")
        try:
            run_gui()
            config = load_config()
        except Exception as e:
            print(f"Error starting GUI: {e}")
            return
            
    if config:
        run_agent(config)
    else:
        print("Setup was not completed. Exiting.")

if __name__ == "__main__":
    main()
