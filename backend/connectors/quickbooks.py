import os
import json
import requests
from datetime import datetime, timedelta
from config import QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REDIRECT_URI

VAULT_PATH = os.path.expanduser("~/CortexVault")
TOKEN_FILE = os.path.expanduser("~/cortex/quickbooks_tokens.json")

AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
BASE_URL  = "https://sandbox-quickbooks.api.intuit.com/v3/company"

def save_tokens(tokens):
    with open(TOKEN_FILE, "w") as f:
        json.dump(tokens, f)

def load_tokens():
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE, "r") as f:
        return json.load(f)

def get_auth_url():
    """Returns the URL the owner visits to authorise QuickBooks."""
    params = {
        "client_id":     QUICKBOOKS_CLIENT_ID,
        "response_type": "code",
        "scope":         "com.intuit.quickbooks.accounting",
        "redirect_uri":  QUICKBOOKS_REDIRECT_URI,
        "state":         "cortex_auth",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{AUTH_URL}?{query}"

def exchange_code_for_tokens(code, realm_id):
    """Exchanges the auth code for access and refresh tokens."""
    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type":   "authorization_code",
            "code":         code,
            "redirect_uri": QUICKBOOKS_REDIRECT_URI,
        },
        auth=(QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET),
    )
    tokens = response.json()
    tokens["realm_id"] = realm_id
    tokens["obtained_at"] = datetime.now().isoformat()
    save_tokens(tokens)
    print("QuickBooks connected successfully.")
    return tokens

def refresh_access_token():
    """Refreshes the access token using the refresh token."""
    tokens = load_tokens()
    if not tokens:
        raise Exception("No QuickBooks tokens found. Please reconnect.")
    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type":    "refresh_token",
            "refresh_token": tokens["refresh_token"],
        },
        auth=(QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET),
    )
    new_tokens = response.json()
    new_tokens["realm_id"]    = tokens["realm_id"]
    new_tokens["obtained_at"] = datetime.now().isoformat()
    save_tokens(new_tokens)
    return new_tokens

def get_headers():
    """Returns auth headers, refreshing token if needed."""
    tokens = load_tokens()
    if not tokens:
        raise Exception("QuickBooks not connected.")
    return {
        "Authorization": f"Bearer {tokens['access_token']}",
        "Accept":        "application/json",
    }

def get_realm_id():
    tokens = load_tokens()
    return tokens["realm_id"] if tokens else None

def fetch_profit_and_loss(start_date, end_date):
    """Fetches P&L report from QuickBooks."""
    realm_id = get_realm_id()
    url = f"{BASE_URL}/{realm_id}/reports/ProfitAndLoss"
    params = {
        "start_date": start_date,
        "end_date":   end_date,
        "accounting_method": "Accrual",
    }
    response = requests.get(url, headers=get_headers(), params=params)
    return response.json()

def fetch_expenses(start_date, end_date):
    """Fetches expense transactions from QuickBooks."""
    realm_id = get_realm_id()
    url = f"{BASE_URL}/{realm_id}/query"
    query = f"SELECT * FROM Purchase WHERE TxnDate >= '{start_date}' AND TxnDate <= '{end_date}'"
    response = requests.get(
        url,
        headers=get_headers(),
        params={"query": query}
    )
    return response.json()

def parse_pl_to_summary(pl_data):
    """
    Parses the QuickBooks P&L response into a simple dict
    that the nightly digest can write to the vault.
    """
    try:
        rows = pl_data.get("Rows", {}).get("Row", [])
        summary = {
            "month":   datetime.now().strftime("%b %Y"),
            "revenue": 0,
            "cogs":    0,
            "labour":  0,
            "rent":    0,
            "other":   0,
            "net":     0,
        }
        for row in rows:
            header = row.get("Header", {}).get("ColData", [{}])[0].get("value", "")
            value_str = row.get("Summary", {}).get("ColData", [{}])
            if len(value_str) > 1:
                try:
                    val = float(value_str[1].get("value", 0))
                except:
                    val = 0
            else:
                val = 0

            header_lower = header.lower()
            if "income" in header_lower or "revenue" in header_lower:
                summary["revenue"] = val
            elif "cost of goods" in header_lower or "cogs" in header_lower:
                summary["cogs"] = val
            elif "payroll" in header_lower or "labour" in header_lower or "labor" in header_lower:
                summary["labour"] = val
            elif "rent" in header_lower:
                summary["rent"] = val
            elif "net" in header_lower:
                summary["net"] = val
            else:
                summary["other"] += val

        return summary
    except Exception as e:
        print(f"Error parsing P&L: {e}")
        return None

def run_quickbooks_pull():
    """
    Main function called by the nightly digest.
    Pulls last 30 days of data from QuickBooks.
    """
    print("Pulling QuickBooks data...")
    end_date   = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    try:
        pl_data = fetch_profit_and_loss(start_date, end_date)
        summary = parse_pl_to_summary(pl_data)
        if summary:
            print(f"QuickBooks pull complete: {summary}")
            return summary
        else:
            print("Could not parse QuickBooks data.")
            return None
    except Exception as e:
        print(f"QuickBooks pull failed: {e}")
        return None