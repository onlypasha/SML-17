import sys
import os

# Add parent directory to path so agent can import local modules 
# properly when run directly from agent/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.config import load_config
from agent.gui import run_gui
from agent.agent import run_agent

def check_single_instance():
    if sys.platform == "win32":
        import ctypes
        mutex_name = "Global\\SML17_Agent_Mutex"
        kernel32 = ctypes.windll.kernel32
        mutex = kernel32.CreateMutexW(None, False, mutex_name)
        if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
            print("Another instance of the agent is already running. Exiting.")
            sys.exit(0)
        # Keep a reference to the mutex so it doesn't get garbage collected
        return mutex
    return None

def main():
    mutex = check_single_instance()
    
    # Redirect stdout/stderr to a log file when running in background mode
    if getattr(sys, 'frozen', False):
        log_path = os.path.join(os.environ.get('PUBLIC', 'C:\\Users\\Public'), 'sml17_agent.log')
        try:
            sys.stdout = open(log_path, 'w', encoding='utf-8', buffering=1)
            sys.stderr = sys.stdout
        except:
            pass

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
