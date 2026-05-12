import os
import json
import requests
from datetime import datetime, timedelta

from config import SQUARE_SANDBOX_APP_ID, SQUARE_SANDBOX_TOKEN, SQUARE_SANDBOX_APP_SECRET
SQUARE_BASE_URL = "https://connect.squareupsandbox.com/v2"

VAULT_PATH = os.path.expanduser("~/CortexVault")
TOKENS_FILE = os.path.join(VAULT_PATH, "integrations/square_tokens.json")

def get_headers(token=None):
    t = token or SQUARE_SANDBOX_TOKEN
    return {
        "Authorization": f"Bearer {t}",
        "Content-Type": "application/json",
        "Square-Version": "2024-01-17"
    }

def save_tokens(data):
    os.makedirs(os.path.dirname(TOKENS_FILE), exist_ok=True)
    with open(TOKENS_FILE, "w") as f:
        json.dump(data, f)

def load_tokens():
    if not os.path.exists(TOKENS_FILE):
        return None
    with open(TOKENS_FILE, "r") as f:
        return json.load(f)

def get_locations(token=None):
    """Get all business locations."""
    res = requests.get(f"{SQUARE_BASE_URL}/locations", headers=get_headers(token))
    if res.status_code == 200:
        return res.json().get("locations", [])
    return []

def get_orders_summary(days=30, token=None):
    """Pull order totals for the last N days."""
    locations = get_locations(token)
    if not locations:
        return {"error": "No locations found"}

    location_id = locations[0]["id"]
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    body = {
        "location_ids": [location_id],
        "query": {
            "filter": {
                "date_time_filter": {
                    "created_at": {
                        "start_at": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "end_at": end.strftime("%Y-%m-%dT%H:%M:%SZ")
                    }
                },
                "state_filter": {"states": ["COMPLETED"]}
            }
        }
    }

    res = requests.post(
        f"{SQUARE_BASE_URL}/orders/search",
        headers=get_headers(token),
        json=body
    )

    if res.status_code != 200:
        return {"error": res.text}

    orders = res.json().get("orders", [])

    total_revenue = sum(
        o.get("total_money", {}).get("amount", 0) for o in orders
    ) / 100  # Square uses cents

    total_orders = len(orders)
    avg_ticket = round(total_revenue / total_orders, 2) if total_orders else 0

    # Group by day
    daily = {}
    for o in orders:
        day = o.get("created_at", "")[:10]
        amount = o.get("total_money", {}).get("amount", 0) / 100
        daily[day] = daily.get(day, 0) + amount

    return {
        "location": locations[0].get("name", "Unknown"),
        "period_days": days,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_ticket": avg_ticket,
        "daily_revenue": dict(sorted(daily.items()))
    }

def get_labor_summary(days=30, token=None):
    """Pull labor hours and costs for the last N days."""
    locations = get_locations(token)
    if not locations:
        return {"error": "No locations found"}

    location_id = locations[0]["id"]
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    params = {
        "location_id": location_id,
        "start_at": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_at": end.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    res = requests.get(
        f"{SQUARE_BASE_URL}/labor/shifts",
        headers=get_headers(token),
        params=params
    )

    if res.status_code != 200:
        return {"error": res.text}

    shifts = res.json().get("shifts", [])

    total_hours = 0
    total_cost = 0

    for shift in shifts:
        start_time = datetime.fromisoformat(shift["start_at"].replace("Z", "+00:00"))
        end_time = datetime.fromisoformat(shift["end_at"].replace("Z", "+00:00")) if shift.get("end_at") else datetime.utcnow().replace(tzinfo=start_time.tzinfo)
        hours = (end_time - start_time).total_seconds() / 3600
        total_hours += hours

        wage = shift.get("wage", {}).get("hourly_rate", {}).get("amount", 0) / 100
        total_cost += hours * wage

    return {
        "period_days": days,
        "total_shifts": len(shifts),
        "total_hours": round(total_hours, 1),
        "total_labor_cost": round(total_cost, 2)
    }

def test_connection():
    """Test if sandbox credentials work."""
    locations = get_locations()
    return {"connected": len(locations) > 0, "locations": len(locations)}


# ── OAuth Flow ────────────────────────────────────────────────────────────────

SQUARE_OAUTH_BASE = "https://connect.squareupsandbox.com"
SQUARE_AUTH_URL = "https://connect.squareupsandbox.com/oauth2/authorize"
SQUARE_TOKEN_URL = "https://connect.squareupsandbox.com/oauth2/token"
SQUARE_REDIRECT_URI = "http://localhost:8000/api/square/callback"

def get_square_auth_url():
    """Returns the URL the owner visits to authorise Square."""
    params = {
        "client_id": SQUARE_SANDBOX_APP_ID,
        "scope": "ORDERS_READ+LABOR_READ+PAYMENTS_READ+MERCHANT_PROFILE_READ",
        "session": "false",
        "state": "cortex_square_auth",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{SQUARE_AUTH_URL}?{query}"

def exchange_square_code(code: str):
    """Exchanges the auth code for Square access token."""
    res = requests.post(
        SQUARE_TOKEN_URL,
        json={
            "client_id": SQUARE_SANDBOX_APP_ID,
            "client_secret": SQUARE_SANDBOX_APP_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": SQUARE_REDIRECT_URI,
        },
        headers={"Content-Type": "application/json", "Square-Version": "2024-01-17"}
    )
    tokens = res.json()
    tokens["obtained_at"] = datetime.utcnow().isoformat()
    save_tokens(tokens)
    return tokens

def refresh_square_token():
    """Refreshes the Square access token."""
    tokens = load_tokens()
    if not tokens or not tokens.get("refresh_token"):
        raise Exception("No Square tokens found.")
    res = requests.post(
        SQUARE_TOKEN_URL,
        json={
            "client_id": SQUARE_SANDBOX_APP_ID,
            "client_secret": SQUARE_SANDBOX_APP_SECRET,
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
        },
        headers={"Content-Type": "application/json", "Square-Version": "2024-01-17"}
    )
    new_tokens = res.json()
    new_tokens["obtained_at"] = datetime.utcnow().isoformat()
    save_tokens(new_tokens)
    return new_tokens
