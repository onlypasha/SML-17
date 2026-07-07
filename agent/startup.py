import os
import sys

def add_to_startup():
    # Only applies to Windows
    if os.name == 'nt':
        try:
            import winreg as reg
            if getattr(sys, 'frozen', False):
                file_path = sys.executable
            else:
                file_path = os.path.abspath(sys.argv[0])
            
            key = reg.HKEY_CURRENT_USER
            key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
            
            open_key = reg.OpenKey(key, key_path, 0, reg.KEY_ALL_ACCESS)
            reg.SetValueEx(open_key, "SML17_Agent", 0, reg.REG_SZ, file_path)
            reg.CloseKey(open_key)
            print("Successfully added agent to Windows startup.")
        except Exception as e:
            print(f"Failed to add to Windows startup: {e}")
    else:
        print("Startup script only supports Windows environments.")
