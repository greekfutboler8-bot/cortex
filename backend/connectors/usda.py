import os
import requests
from datetime import datetime

VAULT_PATH = os.path.expanduser("~/CortexVault")

COMMODITY_REPORTS = {
    "chicken": "3646",   # Weekly National Chicken Report
    "eggs":    "2843",   # Daily National Shell Egg Index (5-day rolling avg)
    "pork":    "2838",   # Weekly Pork & Beef Variety Meat Report
    "beef":    "3228",   # Weekly Grocery Store Beef Feature Activity
    "dairy":   "1623",   # Dairy Monthly Averages
}

BASE_URL = "https://marsapi.ams.usda.gov/services/v1.2/reports"

def get_api_key():
    try:
        from config import USDA_API_KEY
        return USDA_API_KEY
    except ImportError:
        return None

def fetch_commodity_report(report_slug, api_key):
    try:
        url = f"{BASE_URL}/{report_slug}"
        response = requests.get(url, auth=(api_key, ""), timeout=15)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  USDA API error {response.status_code} for report {report_slug}")
            return None
    except Exception as e:
        print(f"  Error fetching report {report_slug}: {e}")
        return None

def run_usda_pull():
    api_key = get_api_key()
    if not api_key:
        print("USDA API key not configured — skipping market prices.")
        return None

    print("Pulling USDA market prices...")

    results = []
    for name, slug in COMMODITY_REPORTS.items():
        data = fetch_commodity_report(slug, api_key)
        if data and data.get("results"):
            latest = data["results"][0]
            results.append({
                "commodity": name,
                "report_date": latest.get("report_date", ""),
                "report_title": latest.get("report_title", ""),
            })
            print(f"  {name}: OK")
        else:
            print(f"  {name}: no data")

    if results:
        save_market_summary(results)

    print(f"USDA pull complete: {len(results)} commodities updated.")
    return results

def save_market_summary(summaries):
    filepath = os.path.join(VAULT_PATH, "market/commodity-prices.md")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    lines = ["# Market Commodity Prices\n"]
    lines.append(f"Last updated: {datetime.now().strftime('%Y-%m-%d')}\n")
    lines.append("Source: USDA Agricultural Marketing Service\n\n")

    for s in summaries:
        lines.append(f"## {s['commodity'].title()}\n")
        lines.append(f"Report: {s['report_title']}\n")
        lines.append(f"Date: {s['report_date']}\n\n")

    with open(filepath, "w") as f:
        f.writelines(lines)
    print("Updated: market/commodity-prices.md")
