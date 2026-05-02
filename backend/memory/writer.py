import os
from datetime import datetime

VAULT_PATH = os.path.expanduser("~/CortexVault")

def append_to_file(filepath, content):
    """Appends content to an existing vault file."""
    with open(filepath, "a") as f:
        f.write("\n\n" + content)

def save_owner_note(note):
    """Saves something the owner typed into the conversation log."""
    filepath = os.path.join(VAULT_PATH, "memory", "owner-conversations.md")
    date = datetime.now().strftime("%Y-%m-%d %H:%M")
    entry = f"## {date}\n{note}"
    append_to_file(filepath, entry)
    print(f"Owner note saved.")

def save_anomaly(anomaly):
    """Logs a flagged anomaly to the anomaly log."""
    filepath = os.path.join(VAULT_PATH, "memory", "anomaly-log.md")
    date = datetime.now().strftime("%Y-%m-%d")
    entry = f"## {date}\n{anomaly}"
    append_to_file(filepath, entry)
    print(f"Anomaly logged.")

def save_prediction(prediction, category="general"):
    """Logs a prediction the LLM made so it can be checked later."""
    filepath = os.path.join(VAULT_PATH, "memory", "prediction-log.md")
    date = datetime.now().strftime("%Y-%m-%d")
    entry = f"## {date} — {category}\nPredicted: {prediction}\nActual: (to be confirmed)"
    append_to_file(filepath, entry)
    print(f"Prediction logged.")

def save_weekly_report(content):
    """Saves the weekly report as a new dated file."""
    date = datetime.now().strftime("%Y-W%W")
    filepath = os.path.join(VAULT_PATH, "weekly-reports", f"{date}.md")
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Weekly report saved: {date}")