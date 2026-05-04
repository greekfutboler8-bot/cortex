import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.memory.writer import save_anomaly

VAULT_PATH = os.path.expanduser("~/CortexVault")

def read_vault_file(relative_path):
    """Reads a vault file and returns its contents."""
    filepath = os.path.join(VAULT_PATH, relative_path)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return f.read()
    return ""

def write_vault_file(relative_path, content):
    """Writes updated content to a vault file."""
    filepath = os.path.join(VAULT_PATH, relative_path)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Updated: {relative_path}")

def update_monthly_summary(data):
    """
    Takes a dict of monthly financial data and rewrites
    the monthly summary vault file.
    """
    lines = ["# Monthly Financial Summary\n"]
    lines.append(f"Last updated: {datetime.now().strftime('%Y-%m-%d')}\n")
    lines.append("\n| Month | Revenue | COGS | Labour | Rent | Other | Net |\n")
    lines.append("|-------|---------|------|--------|------|-------|-----|\n")

    for month in data:
        lines.append(
            f"| {month['month']} "
            f"| ${month['revenue']:,} "
            f"| ${month['cogs']:,} "
            f"| ${month['labour']:,} "
            f"| ${month['rent']:,} "
            f"| ${month['other']:,} "
            f"| ${month['net']:,} |\n"
        )

    write_vault_file("financials/monthly-summary.md", "".join(lines))

def check_for_anomalies(data):
    """
    Scans the latest data for anything worth flagging.
    Saves anomalies to the anomaly log automatically.
    """
    if not data:
        return

    latest   = data[-1]
    previous = data[-2] if len(data) > 1 else None

    # Check labour cost percentage
    if latest["revenue"] > 0:
        labour_pct = (latest["labour"] / latest["revenue"]) * 100
        if labour_pct > 33:
            save_anomaly(
                f"Labour cost reached {labour_pct:.1f}% of revenue in "
                f"{latest['month']} — above the 33% threshold."
            )

    # Check for revenue drop vs previous month
    if previous and previous["revenue"] > 0:
        revenue_change = ((latest["revenue"] - previous["revenue"])
                          / previous["revenue"]) * 100
        if revenue_change < -20:
            save_anomaly(
                f"Revenue dropped {abs(revenue_change):.1f}% from "
                f"{previous['month']} to {latest['month']}."
            )

    # Check for negative net profit
    if latest["net"] < 0:
        save_anomaly(
            f"Net profit was negative in {latest['month']}: "
            f"${latest['net']:,}."
        )

def run_nightly_digest(financial_data=None):
    """
    Main function — runs the full nightly update.
    Called automatically at 2am by the scheduler.
    """
    print(f"\nCortex nightly digest starting — "
          f"{datetime.now().strftime('%Y-%m-%d %H:%M')}")

    # Run CSV importer
    from backend.connectors.excel import run_csv_import
    run_csv_import()

    # Run QuickBooks pull if connected
    from backend.connectors.quickbooks import load_tokens, run_quickbooks_pull
    tokens = load_tokens()
    if tokens:
        print("QuickBooks connected — pulling latest data...")
        qb_data = run_quickbooks_pull()
        if qb_data:
            financial_data = [qb_data] if not financial_data else financial_data + [qb_data]
    else:
        print("QuickBooks not connected — skipping.")

    if financial_data:
        print("Updating monthly summary...")
        update_monthly_summary(financial_data)

        print("Checking for anomalies...")
        check_for_anomalies(financial_data)

    print("Nightly digest complete.\n")

if __name__ == "__main__":
    # Test data — replace with real connector data later
    test_data = [
        {"month": "Jun 2024", "revenue": 68000, "cogs": 18000,
         "labour": 19000, "rent": 8000, "other": 3000, "net": 20000},
        {"month": "Jul 2024", "revenue": 72000, "cogs": 19500,
         "labour": 20000, "rent": 8000, "other": 3200, "net": 21300},
        {"month": "Aug 2024", "revenue": 86000, "cogs": 28000,
         "labour": 22000, "rent": 8000, "other": 3500, "net": 24500},
        {"month": "Sep 2024", "revenue": 71000, "cogs": 19000,
         "labour": 22500, "rent": 8000, "other": 3100, "net": 18400},
        {"month": "Oct 2024", "revenue": 69000, "cogs": 18500,
         "labour": 23000, "rent": 8000, "other": 3000, "net": 16500},
        {"month": "Nov 2024", "revenue": 65000, "cogs": 17500,
         "labour": 23500, "rent": 8000, "other": 2900, "net": 13100},
        {"month": "Dec 2024", "revenue": 78000, "cogs": 21000,
         "labour": 24000, "rent": 8000, "other": 3200, "net": 21800},
        {"month": "Jan 2025", "revenue": 48000, "cogs": 13000,
         "labour": 22000, "rent": 8000, "other": 2800, "net": 2200},
        {"month": "Feb 2025", "revenue": 44000, "cogs": 12000,
         "labour": 21000, "rent": 8000, "other": 2600, "net": 400},
    ]
    run_nightly_digest(test_data)