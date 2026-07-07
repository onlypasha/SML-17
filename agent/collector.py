import psutil

def get_system_metrics():
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    
    # RAM usage
    ram = psutil.virtual_memory()
    ram_percent = ram.percent
    
    # Disk usage (C: on Windows, / on Linux)
    try:
        disk = psutil.disk_usage('C:\\')
    except Exception:
        disk = psutil.disk_usage('/')
    disk_percent = disk.percent
    
    processes = []
    apps = []

    return {
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "disk_percent": disk_percent,
        "processes": processes,
        "apps": apps
    }
