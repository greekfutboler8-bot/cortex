import os
import json
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

# Key items to extract per commodity
KEY_ITEMS = {
    "chicken": ["Breast - B/S", "Whole Bird", "Wings", "Thighs"],
    "eggs":    ["Grade A Large", "Grade A Medium", "Grade AA Large"],
    "pork":    ["Loin - Boneless", "Belly", "Shoulder - Boneless"],
    "beef":    ["Ground Beef", "Chuck Roast", "Ribeye", "Sirloin"],
    "dairy":   ["Butter", "Cheddar Cheese", "Whole Milk"],
}

BASE_URL = "https://marsapi.ams.usda.gov/services/v1.2/reports"

def get_api_key():
    try:
        from config import USDA_API_KEY
        return USDA_API_KEY
    except ImportError:
        return None

def fetch_report_detail(report_slug, api_key):
    """Fetch the Report Detail section with actual price data."""
    try:
        url = f"{BASE_URL}/{report_slug}"
        params = {"allSections": "true"}
        response = requests.get(url, auth=(api_key, ""), params=params, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Get latest report_date from header
                latest_date = None
                for section in data:
                    if section.get("reportSection") == "Report Header":
                        results = section.get("results", [])
                        if results:
                            latest_date = results[0].get("report_date")
                        break
                # Now get detail rows — try multiple section name variants
                detail_section_names = [
                    "Report Detail",
                    "Report Details",
                    "Report Detail Weighted",
                    "Report Volume Weighted",
                ]
                for detail_name in detail_section_names:
                    for section in data:
                        if section.get("reportSection") == detail_name:
                            rows = section.get("results", [])
                            if latest_date:
                                rows = [r for r in rows if r.get("report_date") == latest_date]
                            if rows:
                                return rows
            return []
        else:
            print(f"  USDA API error {response.status_code} for report {report_slug}")
            return []
    except Exception as e:
        print(f"  Error fetching report {report_slug}: {e}")
        return []

def extract_prices(rows, commodity):
    """Extract key price items from report detail rows."""
    prices = []
    key_items = KEY_ITEMS.get(commodity, [])

    for row in rows:
        item = row.get("item", "")
        # Include if it matches a key item or just take first 5 if no key items match
        if any(k.lower() in item.lower() for k in key_items) or not key_items:
            price_entry = {
                "item": item,
                "price_unit": row.get("price_unit", ""),
                "wtd_avg_price": row.get("wtd_avg_price"),
                "wtd_avg_price_previous": row.get("wtd_avg_price_previous"),
                "price_change": row.get("price_change"),
                "low_price": row.get("low_price"),
                "high_price": row.get("high_price"),
                "report_date": row.get("report_date", ""),
            }
            prices.append(price_entry)
            if len(prices) >= 5:
                break

    # If no key items matched, just take first 5
    if not prices and rows:
        for row in rows[:5]:
            prices.append({
                "item": row.get("item", ""),
                "price_unit": row.get("price_unit", ""),
                "wtd_avg_price": row.get("wtd_avg_price"),
                "wtd_avg_price_previous": row.get("wtd_avg_price_previous"),
                "price_change": row.get("price_change"),
                "low_price": row.get("low_price"),
                "high_price": row.get("high_price"),
                "report_date": row.get("report_date", ""),
            })

    return prices

def run_usda_pull():
    """Main function called by the nightly digest."""
    api_key = get_api_key()
    if not api_key:
        print("USDA API key not configured — skipping market prices.")
        return None

    print("Pulling USDA market prices...")

    market_data = {
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "commodities": {}
    }

    for name, slug in COMMODITY_REPORTS.items():
        rows = fetch_report_detail(slug, api_key)
        if rows:
            prices = extract_prices(rows, name)
            report_date = rows[0].get("report_date", "") if rows else ""
            report_title = rows[0].get("report_title", "") if rows else ""
            market_data["commodities"][name] = {
                "report_title": report_title,
                "report_date": report_date,
                "prices": prices
            }
            print(f"  {name}: {len(prices)} price points")
        else:
            print(f"  {name}: no data")

    if market_data["commodities"]:
        save_market_data(market_data)
        save_market_markdown(market_data)

    print(f"USDA pull complete: {len(market_data['commodities'])} commodities updated.")
    return market_data

def save_market_data(data):
    """Save structured JSON for the dashboard API."""
    filepath = os.path.join(VAULT_PATH, "market/commodity-prices.json")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def save_market_markdown(data):
    """Save human-readable markdown version."""
    filepath = os.path.join(VAULT_PATH, "market/commodity-prices.md")
    lines = ["# Market Commodity Prices\n"]
    lines.append(f"Last updated: {data['last_updated']}\n")
    lines.append("Source: USDA Agricultural Marketing Service\n\n")

    for name, commodity in data["commodities"].items():
        lines.append(f"## {name.title()}\n")
        lines.append(f"Report: {commodity['report_title']}\n")
        lines.append(f"Date: {commodity['report_date']}\n\n")
        for p in commodity["prices"]:
            avg = p.get("wtd_avg_price", "—")
            prev = p.get("wtd_avg_price_previous", "—")
            change = p.get("price_change", 0) or 0
            arrow = "↑" if change > 0 else "↓" if change < 0 else "→"
            lines.append(f"- **{p['item']}**: {avg} {p.get('price_unit','')} {arrow} (prev: {prev})\n")
        lines.append("\n")

    with open(filepath, "w") as f:
        f.writelines(lines)
    print("Updated: market/commodity-prices.md")
