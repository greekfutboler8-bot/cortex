import os
import csv
import json
from datetime import datetime

VAULT_PATH = os.path.expanduser("~/CortexVault")
WATCH_DIR  = os.path.expanduser("~/CortexWatch")

def ensure_watch_dir():
    """
    Creates the watch folder if it doesn't exist.
    This is the folder the owner drops CSV/Excel exports into.
    """
    os.makedirs(WATCH_DIR, exist_ok=True)

def get_watched_files():
    """Returns all CSV files in the watch folder."""
    ensure_watch_dir()
    files = []
    for f in os.listdir(WATCH_DIR):
        if f.endswith(".csv") or f.endswith(".txt"):
            files.append(os.path.join(WATCH_DIR, f))
    return files

def detect_file_type(headers):
    """
    Looks at the column headers to figure out what kind
    of data this CSV contains.
    """
    headers_lower = [h.lower().strip() for h in headers]

    if any(h in headers_lower for h in ["total", "net", "revenue", "sales"]):
        return "revenue"
    if any(h in headers_lower for h in ["vendor", "supplier", "amount", "expense"]):
        return "expenses"
    if any(h in headers_lower for h in ["sku", "stock", "quantity", "inventory", "product"]):
        return "inventory"
    if any(h in headers_lower for h in ["employee", "hours", "wage", "payroll"]):
        return "payroll"
    return "general"

def parse_csv(filepath):
    """Reads a CSV file and returns headers and rows."""
    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        for row in reader:
            rows.append(dict(row))
    return headers, rows

def summarise_revenue(rows, headers):
    """Turns revenue CSV rows into a readable markdown summary."""
    lines = ["# Revenue Data (imported from CSV)\n"]
    lines.append(f"Imported: {datetime.now().strftime('%Y-%m-%d')}\n")
    lines.append(f"Total rows: {len(rows)}\n\n")

    # Try to find date and amount columns
    date_col   = next((h for h in headers if "date" in h.lower()), None)
    amount_col = next((h for h in headers if any(
        w in h.lower() for w in ["total", "revenue", "sales", "amount", "net"]
    )), None)

    if date_col and amount_col:
        lines.append(f"| {date_col} | {amount_col} |\n")
        lines.append("|---|---|\n")
        total = 0
        for row in rows[-30:]:  # Last 30 entries
            val = row.get(amount_col, "0").replace("$", "").replace(",", "")
            try:
                total += float(val)
            except:
                pass
            lines.append(f"| {row.get(date_col, '')} | {row.get(amount_col, '')} |\n")
        lines.append(f"\n**Total (last {min(30, len(rows))} entries):** ${total:,.2f}\n")
    else:
        for row in rows[:20]:
            lines.append(str(row) + "\n")

    return "".join(lines)

def summarise_expenses(rows, headers):
    """Turns expense CSV rows into a readable markdown summary."""
    lines = ["# Expense Data (imported from CSV)\n"]
    lines.append(f"Imported: {datetime.now().strftime('%Y-%m-%d')}\n\n")

    vendor_col = next((h for h in headers if any(
        w in h.lower() for w in ["vendor", "supplier", "name", "payee"]
    )), None)
    amount_col = next((h for h in headers if any(
        w in h.lower() for w in ["amount", "total", "cost", "expense"]
    )), None)

    if vendor_col and amount_col:
        # Group by vendor
        vendors = {}
        for row in rows:
            vendor = row.get(vendor_col, "Unknown")
            val = row.get(amount_col, "0").replace("$", "").replace(",", "")
            try:
                vendors[vendor] = vendors.get(vendor, 0) + float(val)
            except:
                pass

        lines.append("## Spend by vendor\n\n")
        for vendor, total in sorted(vendors.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- **{vendor}:** ${total:,.2f}\n")
    else:
        for row in rows[:20]:
            lines.append(str(row) + "\n")

    return "".join(lines)

def summarise_inventory(rows, headers):
    """Turns inventory CSV rows into a readable markdown summary."""
    lines = ["# Inventory Data (imported from CSV)\n"]
    lines.append(f"Imported: {datetime.now().strftime('%Y-%m-%d')}\n\n")

    sku_col = next((h for h in headers if any(
        w in h.lower() for w in ["sku", "item", "product", "name"]
    )), None)
    qty_col = next((h for h in headers if any(
        w in h.lower() for w in ["quantity", "qty", "stock", "on hand"]
    )), None)

    if sku_col and qty_col:
        lines.append("## Stock levels\n\n")
        lines.append(f"| Item | Quantity |\n|---|---|\n")
        for row in rows:
            qty = row.get(qty_col, "0").replace(",", "")
            try:
                qty_int = int(float(qty))
                flag = " ⚠ LOW" if qty_int < 5 else ""
                lines.append(f"| {row.get(sku_col, '')} | {qty_int}{flag} |\n")
            except:
                lines.append(f"| {row.get(sku_col, '')} | {row.get(qty_col, '')} |\n")
    else:
        for row in rows[:20]:
            lines.append(str(row) + "\n")

    return "".join(lines)

def write_to_vault(content, file_type):
    """Writes the parsed CSV summary to the appropriate vault file."""
    paths = {
        "revenue":   "revenue/csv-import.md",
        "expenses":  "financials/csv-expenses.md",
        "inventory": "inventory/csv-stock.md",
        "payroll":   "financials/csv-payroll.md",
        "general":   "financials/csv-general.md",
    }
    relative_path = paths.get(file_type, "financials/csv-general.md")
    filepath = os.path.join(VAULT_PATH, relative_path)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"CSV data written to vault: {relative_path}")

def run_csv_import():
    """
    Main function called by the nightly digest.
    Scans the watch folder and imports any CSV files found.
    """
    files = get_watched_files()
    if not files:
        print("No CSV files found in watch folder.")
        return

    print(f"Found {len(files)} CSV file(s) to import.")
    for filepath in files:
        print(f"Processing: {os.path.basename(filepath)}")
        try:
            headers, rows = parse_csv(filepath)
            file_type = detect_file_type(headers)
            print(f"  Detected type: {file_type}")

            if file_type == "revenue":
                content = summarise_revenue(rows, headers)
            elif file_type == "expenses":
                content = summarise_expenses(rows, headers)
            elif file_type == "inventory":
                content = summarise_inventory(rows, headers)
            else:
                content = summarise_revenue(rows, headers)

            write_to_vault(content, file_type)
            print(f"  Done.")
        except Exception as e:
            print(f"  Error processing {filepath}: {e}")