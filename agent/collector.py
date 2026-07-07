import psutil
import platform
import time
import logging

logger = logging.getLogger(__name__)

# --- Apps cache ---
_apps_cache: list = []
_apps_cache_timestamp: float = 0.0
_APPS_CACHE_TTL: int = 60  # seconds


def get_installed_apps() -> list:
    """
    Enumerate installed applications.

    On Windows: reads from the registry Uninstall keys (both native and Wow6432Node).
    On Linux/other: returns an empty list (development fallback).

    Returns:
        list of dict with keys: name (str), version (str)
    """
    global _apps_cache, _apps_cache_timestamp

    now = time.time()
    if _apps_cache and (now - _apps_cache_timestamp) < _APPS_CACHE_TTL:
        return _apps_cache

    apps: list = []

    if platform.system() == "Windows":
        try:
            import winreg

            registry_paths = [
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            ]

            for reg_path in registry_paths:
                try:
                    key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                except OSError:
                    continue

                try:
                    i = 0
                    while True:
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            i += 1
                        except OSError:
                            break

                        try:
                            subkey = winreg.OpenKey(key, subkey_name)
                        except OSError:
                            continue

                        try:
                            display_name, _ = winreg.QueryValueEx(
                                subkey, "DisplayName"
                            )
                        except OSError:
                            winreg.CloseKey(subkey)
                            continue

                        # Skip entries without a display name
                        if not display_name or not display_name.strip():
                            winreg.CloseKey(subkey)
                            continue

                        try:
                            version, _ = winreg.QueryValueEx(
                                subkey, "DisplayVersion"
                            )
                        except OSError:
                            version = ""

                        apps.append({
                            "name": display_name.strip(),
                            "version": (version or "").strip(),
                        })
                        winreg.CloseKey(subkey)
                finally:
                    winreg.CloseKey(key)

        except Exception as e:
            logger.warning("Failed to enumerate installed apps: %s", e)

    # Deduplicate by name (Wow6432Node may overlap with native)
    seen = set()
    unique_apps = []
    for app in apps:
        if app["name"] not in seen:
            seen.add(app["name"])
            unique_apps.append(app)

    _apps_cache = unique_apps
    _apps_cache_timestamp = now
    return _apps_cache


def get_running_services() -> list:
    """
    Enumerate running services / processes.

    On Windows: uses psutil.win32_service_iter() to list Windows services.
    On Linux/other: falls back to listing top processes by memory as a
    lightweight development substitute.

    Returns:
        list of dict with keys: pid (int), name (str), status (str)
    """
    services: list = []

    if platform.system() == "Windows":
        try:
            for svc in psutil.win32_service_iter():
                try:
                    info = svc.as_dict()
                    services.append({
                        "pid": info.get("pid") or 0,
                        "name": info.get("name", ""),
                        "status": info.get("status", "unknown"),
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.warning("Failed to enumerate Windows services: %s", e)
    else:
        # Linux / macOS fallback — list top processes for dev testing
        try:
            for proc in psutil.process_iter(["pid", "name", "status"]):
                try:
                    info = proc.info
                    services.append({
                        "pid": info["pid"],
                        "name": info["name"] or "",
                        "status": info["status"] or "unknown",
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.warning("Failed to enumerate processes: %s", e)

    return services


def get_system_metrics() -> dict:
    """
    Collect system metrics including CPU, RAM, disk usage,
    installed applications, and running services.

    Returns:
        dict with keys: cpu_percent, ram_percent, disk_percent,
                        processes (list), apps (list)
    """
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

    processes = get_running_services()
    apps = get_installed_apps()

    return {
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "disk_percent": disk_percent,
        "processes": processes,
        "apps": apps,
    }
