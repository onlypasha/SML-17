import tkinter as tk
import sys
import threading

def block_keys():
    try:
        import keyboard
        # Block common breakout keys
        for key in ['alt+tab', 'alt+f4', 'win', 'ctrl+esc']:
            try:
                keyboard.block_key(key)
            except:
                pass
    except ImportError:
        pass # If keyboard is not installed, fail silently (handled by requirements.txt usually)

def main():
    message = "PC TERKUNCI"
    if len(sys.argv) > 1:
        message = sys.argv[1]

    root = tk.Tk()
    root.attributes("-fullscreen", True)
    root.attributes("-topmost", True)
    root.configure(background="black")
    root.overrideredirect(True)
    
    # Keep it on top forcefully
    def stay_on_top():
        root.attributes("-topmost", True)
        root.after(500, stay_on_top)
        
    stay_on_top()

    # Disable closing
    root.protocol("WM_DELETE_WINDOW", lambda: None)

    label = tk.Label(root, text=message, font=("Helvetica", 48, "bold"), fg="white", bg="black", wraplength=1000)
    label.pack(expand=True)
    
    sub_label = tk.Label(root, text="Menunggu admin untuk membuka kunci...", font=("Helvetica", 20), fg="gray", bg="black")
    sub_label.pack(pady=50)

    # Start blocking keys in background
    threading.Thread(target=block_keys, daemon=True).start()

    root.mainloop()

if __name__ == "__main__":
    main()
