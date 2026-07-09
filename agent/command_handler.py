"""
Command handler for the agent.
Connects to the server's command WebSocket and executes received commands.
"""
import asyncio
import json
import subprocess
import platform
import threading
import websockets
import sys
import os
import psutil

_locker_process = None

async def taskmgr_alarm_loop(websocket):
    global _locker_process
    while True:
        await asyncio.sleep(1)
        if _locker_process is not None and _locker_process.poll() is None:
            # Locker is running! Check for taskmgr
            try:
                for proc in psutil.process_iter(["name"]):
                    if proc.info["name"] and proc.info["name"].lower() == "taskmgr.exe":
                        proc.kill()
                        # Send alert to server
                        alert = {
                            "command": "lock_alert",
                            "success": True,
                            "message": "ALARM: Siswa mencoba membuka Task Manager (Ctrl+Alt+Del). Task Manager berhasil dibunuh!"
                        }
                        await websocket.send(json.dumps(alert))
            except Exception:
                pass


async def run_command_listener(server_url: str, agent_id: str):
    """Connect to server command channel and listen for commands."""
    ws_url = server_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_url.rstrip('/')}/commands/ws/{agent_id}"

    while True:
        try:
            async with websockets.connect(ws_endpoint) as websocket:
                print(f"CommandHandler: Connected to {ws_endpoint}")
                
                alarm_task = asyncio.create_task(taskmgr_alarm_loop(websocket))

                try:
                    async for message in websocket:
                        data = json.loads(message)
                        command = data.get("command", "")
                        payload = data.get("payload", {})

                        print(f"CommandHandler: Received command '{command}' with payload {payload}")

                        result = execute_command(command, payload)

                        # Send result back to server
                        await websocket.send(json.dumps(result))
                finally:
                    alarm_task.cancel()

        except Exception as e:
            print(f"CommandHandler: Connection error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)


def execute_command(command: str, payload: dict) -> dict:
    """Execute a command and return the result."""
    try:
        if command == "stop_service":
            return stop_service(payload.get("service_name", ""))
        elif command == "uninstall_app":
            return uninstall_app(payload.get("app_name", ""))
        elif command == "kill_process":
            return kill_process(payload.get("pid", 0))
        elif command == "download_file":
            return download_file(payload.get("filename", ""), payload.get("url", ""))
        elif command == "lock_screen":
            return lock_screen(payload.get("message", "PC TERKUNCI"))
        elif command == "unlock_screen":
            return unlock_screen()
        else:
            return {
                "command": command,
                "success": False,
                "message": f"Unknown command: {command}"
            }
    except Exception as e:
        return {
            "command": command,
            "success": False,
            "message": f"Error executing command: {str(e)}"
        }


def lock_screen(message: str) -> dict:
    global _locker_process
    if platform.system() != "Windows":
        return {"command": "lock_screen", "success": False, "message": "Lock screen is for Windows only."}
    
    if _locker_process and _locker_process.poll() is None:
        _locker_process.kill()
        
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "locker.py")
    try:
        _locker_process = subprocess.Popen([sys.executable, script_path, message])
        return {"command": "lock_screen", "success": True, "message": "Layar berhasil dikunci."}
    except Exception as e:
        return {"command": "lock_screen", "success": False, "message": str(e)}

def unlock_screen() -> dict:
    global _locker_process
    if _locker_process and _locker_process.poll() is None:
        try:
            _locker_process.kill()
            _locker_process = None
            return {"command": "unlock_screen", "success": True, "message": "Layar berhasil dibuka."}
        except Exception as e:
            return {"command": "unlock_screen", "success": False, "message": str(e)}
    return {"command": "unlock_screen", "success": True, "message": "Layar sudah tidak terkunci."}


def download_file(filename: str, url: str) -> dict:
    """Download a file from the server and save it to the public desktop."""
    if not filename or not url:
        return {"command": "download_file", "success": False, "message": "Missing filename or url."}
    
    import urllib.request
    import os
    
    # Use Public Desktop so all users can see it
    if platform.system() == "Windows":
        desktop = os.environ.get("PUBLIC", "C:\\Users\\Public") + "\\Desktop"
    else:
        desktop = os.path.expanduser("~/Desktop")
        
    os.makedirs(desktop, exist_ok=True)
    dest_path = os.path.join(desktop, filename)
    
    try:
        urllib.request.urlretrieve(url, dest_path)
        return {"command": "download_file", "success": True, "message": f"File '{filename}' downloaded to Desktop."}
    except Exception as e:
        return {"command": "download_file", "success": False, "message": str(e)}


def stop_service(service_name: str) -> dict:
    """Stop a Windows service by name."""
    if not service_name:
        return {"command": "stop_service", "success": False, "message": "No service name provided."}

    if platform.system() != "Windows":
        return {"command": "stop_service", "success": False, "message": "Service management only available on Windows."}

    try:
        result = subprocess.run(
            ["sc", "stop", service_name],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return {"command": "stop_service", "success": True, "message": f"Service '{service_name}' stopped."}
        else:
            return {"command": "stop_service", "success": False, "message": result.stderr.strip() or result.stdout.strip()}
    except subprocess.TimeoutExpired:
        return {"command": "stop_service", "success": False, "message": "Command timed out."}
    except Exception as e:
        return {"command": "stop_service", "success": False, "message": str(e)}


def uninstall_app(app_name: str) -> dict:
    """Attempt to uninstall an application on Windows using its uninstall string from registry."""
    if not app_name:
        return {"command": "uninstall_app", "success": False, "message": "No app name provided."}

    if platform.system() != "Windows":
        return {"command": "uninstall_app", "success": False, "message": "App uninstall only available on Windows."}

    try:
        import winreg
        
        uninstall_string = None
        
        hives = [winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER]
        reg_paths = [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ]
        
        for hive in hives:
            for reg_path in reg_paths:
                try:
                    key = winreg.OpenKey(hive, reg_path)
                for i in range(winreg.QueryInfoKey(key)[0]):
                    try:
                        subkey_name = winreg.EnumKey(key, i)
                        subkey = winreg.OpenKey(key, subkey_name)
                        try:
                            display_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                            if display_name.lower() == app_name.lower():
                                uninstall_string = winreg.QueryValueEx(subkey, "UninstallString")[0]
                                break
                        except OSError:
                            pass
                        finally:
                            winreg.CloseKey(subkey)
                    except OSError:
                        continue
                winreg.CloseKey(key)
                if uninstall_string:
                    break
            if uninstall_string:
                break

        if not uninstall_string:
            return {"command": "uninstall_app", "success": False, "message": f"Uninstall string not found for '{app_name}'."}

        # Run uninstall (silent if possible)
        # Add /S or /silent for common installers
        if "msiexec" in uninstall_string.lower():
            cmd = uninstall_string.replace("/I", "/X").replace("/i", "/x") + " /qn"
        else:
            cmd = uninstall_string + " /S"

        result = subprocess.run(
            cmd, shell=False, capture_output=True, text=True, timeout=120
        )
        
        if result.returncode == 0:
            return {"command": "uninstall_app", "success": True, "message": f"Uninstall started for '{app_name}'."}
        else:
            return {"command": "uninstall_app", "success": False, "message": result.stderr.strip() or f"Exit code: {result.returncode}"}

    except Exception as e:
        return {"command": "uninstall_app", "success": False, "message": str(e)}


def kill_process(pid: int) -> dict:
    """Kill a process by PID."""
    if not pid:
        return {"command": "kill_process", "success": False, "message": "No PID provided."}
    
    try:
        import psutil
        proc = psutil.Process(pid)
        proc_name = proc.name()
        proc.kill()
        return {"command": "kill_process", "success": True, "message": f"Process '{proc_name}' (PID {pid}) killed."}
    except psutil.AccessDenied:
        return {"command": "kill_process", "success": False, "message": "Access denied. Try running the Agent as Administrator."}
    except psutil.NoSuchProcess:
        return {"command": "kill_process", "success": False, "message": f"Process {pid} not found or already dead."}
    except Exception as e:
        return {"command": "kill_process", "success": False, "message": str(e)}


def start_command_listener_thread(server_url: str, agent_id: str):
    """Start the command listener in a background thread."""
    def loop_in_thread():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_command_listener(server_url, agent_id))

    t = threading.Thread(target=loop_in_thread, daemon=True)
    t.start()
    print(f"CommandHandler: Background thread started for agent {agent_id}")
