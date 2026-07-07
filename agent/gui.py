import tkinter as tk
from tkinter import messagebox
from agent.config import save_config
from agent.startup import add_to_startup

def run_gui():
    root = tk.Tk()
    root.title("SML-17 Agent Setup")
    root.geometry("300x250")

    tk.Label(root, text="Server URL:").pack(pady=5)
    url_entry = tk.Entry(root, width=30)
    url_entry.insert(0, "http://localhost:8000")
    url_entry.pack()

    tk.Label(root, text="PC Name:").pack(pady=5)
    name_entry = tk.Entry(root, width=30)
    name_entry.insert(0, "Lab-PC-01")
    name_entry.pack()

    tk.Label(root, text="Interval (seconds):").pack(pady=5)
    interval_entry = tk.Entry(root, width=30)
    interval_entry.insert(0, "5")
    interval_entry.pack()

    def on_save():
        url = url_entry.get()
        name = name_entry.get()
        interval = interval_entry.get()
        if not url or not name or not interval:
            messagebox.showerror("Error", "All fields are required")
            return
        try:
            interval = int(interval)
        except ValueError:
            messagebox.showerror("Error", "Interval must be a number")
            return
        
        save_config(url, name, interval)
        add_to_startup()
        messagebox.showinfo("Success", "Configuration saved successfully. Agent will now start.")
        root.destroy()

    tk.Button(root, text="Save & Start", command=on_save).pack(pady=20)
    root.mainloop()
