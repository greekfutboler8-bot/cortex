import sys
import os
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import ollama

from backend.memory.rag import get_context_for_query
from backend.memory.reader import get_vault_files
from backend.memory.writer import save_owner_note

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VAULT_PATH = os.path.expanduser("~/CortexVault")
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

class Query(BaseModel):
    question: str
    save_note: bool = False

SYSTEM_PROMPT = """
You are Cortex, a private business advisor for a specific small business.
You have been given a set of files containing everything known about this business.

Your rules — follow these exactly:
- Answer ONLY using the information in the provided files. Never use general knowledge or make up numbers.
- If the specific answer is not clearly stated in the files, say exactly: "I don't have enough data on that yet."
- Never invent figures, averages, or statistics that are not explicitly written in the files.
- Be direct and plain. No jargon. Speak like a trusted advisor, not a consultant.
- When you spot a problem, say so clearly and suggest one concrete action.
- Keep answers concise — the owner is busy.
- If asked about a specific number or statistic you cannot find, admit it clearly rather than guessing.
"""

# ── Vault parsers ─────────────────────────────────────────────────────────────

def read_vault_file(relative_path):
    full_path = os.path.join(VAULT_PATH, relative_path)
    if not os.path.exists(full_path):
        return ""
    with open(full_path, "r") as f:
        return f.read()

def parse_business_profile():
    content = read_vault_file("core/business-profile.md")
    result = {
        "name": "My Business",
        "industry": "",
        "location": "",
        "owner": "",
        "employees_full": 0,
        "employees_part": 0,
        "revenue_target": 0,
        "food_cost_target": 28,
        "labour_cost_target": 30,
    }
    for line in content.splitlines():
        if "**Name:**" in line:
            result["name"] = line.split("**Name:**")[-1].strip()
        elif "**Industry:**" in line:
            result["industry"] = line.split("**Industry:**")[-1].strip()
        elif "**Location:**" in line:
            result["location"] = line.split("**Location:**")[-1].strip()
        elif "**Owner:**" in line:
            result["owner"] = line.split("**Owner:**")[-1].strip()
        elif "**Full-time employees:**" in line:
            try:
                result["employees_full"] = int(re.search(r'\d+', line).group())
            except:
                pass
        elif "**Part-time employees:**" in line:
            try:
                result["employees_part"] = int(re.search(r'\d+', line).group())
            except:
                pass
        elif "Average monthly revenue" in line:
            m = re.search(r'\$([0-9,]+)', line)
            if m:
                result["revenue_target"] = int(m.group(1).replace(",", ""))
        elif "food cost target" in line.lower():
            m = re.search(r'(\d+)%', line)
            if m:
                result["food_cost_target"] = int(m.group(1))
        elif "labour cost target" in line.lower():
            m = re.search(r'(\d+)%', line)
            if m:
                result["labour_cost_target"] = int(m.group(1))
    return result

def parse_monthly_summary():
    content = read_vault_file("financials/monthly-summary.md")
    months = []
    for line in content.splitlines():
        if line.startswith("|") and "---" not in line and "Month" not in line:
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 7:
                def parse_dollar(s):
                    try:
                        return int(re.sub(r'[^\d]', '', s))
                    except:
                        return 0
                months.append({
                    "month": parts[0],
                    "revenue": parse_dollar(parts[1]),
                    "cogs": parse_dollar(parts[2]),
                    "labour": parse_dollar(parts[3]),
                    "rent": parse_dollar(parts[4]),
                    "other": parse_dollar(parts[5]),
                    "net": parse_dollar(parts[6]),
                })
    return months

def parse_anomalies():
    content = read_vault_file("memory/anomaly-log.md")
    alerts = []
    current = None
    for line in content.splitlines():
        if line.startswith("## "):
            if current:
                alerts.append(current)
            date = line.replace("## ", "").strip()
            current = {"date": date, "text": "", "status": ""}
        elif current is not None:
            if line.startswith("Status:"):
                current["status"] = line.replace("Status:", "").strip()
            elif line.strip():
                current["text"] += line.strip() + " "
    if current:
        alerts.append(current)
    alerts = [a for a in alerts if a["text"].strip()]
    alerts.reverse()
    return alerts

def compute_dashboard_metrics(months):
    if not months:
        return {}
    latest = months[-1]
    previous = months[-2] if len(months) >= 2 else latest
    revenue = latest["revenue"]
    prev_revenue = previous["revenue"]
    labour = latest["labour"]
    cogs = latest["cogs"]
    net = latest["net"]
    labour_pct = round((labour / revenue * 100), 1) if revenue else 0
    cogs_pct = round((cogs / revenue * 100), 1) if revenue else 0
    net_margin = round((net / revenue * 100), 1) if revenue else 0
    revenue_change = round(((revenue - prev_revenue) / prev_revenue * 100), 1) if prev_revenue else 0
    return {
        "latest_month": latest["month"],
        "revenue": revenue,
        "revenue_change_pct": revenue_change,
        "net_profit": net,
        "net_margin_pct": net_margin,
        "labour_cost": labour,
        "labour_pct": labour_pct,
        "cogs": cogs,
        "cogs_pct": cogs_pct,
    }

# ── Briefing cache ────────────────────────────────────────────────────────────
_briefing_cache = {"text": None, "date": None}

def generate_briefing():
    from datetime import date
    today = str(date.today())
    if _briefing_cache["date"] == today and _briefing_cache["text"]:
        return _briefing_cache["text"]
    profile = parse_business_profile()
    months = parse_monthly_summary()
    anomalies = parse_anomalies()
    latest = months[-1] if months else {}
    previous = months[-2] if len(months) >= 2 else {}
    labour_pct = round((latest.get("labour", 0) / latest.get("revenue", 1)) * 100, 1)
    cogs_pct = round((latest.get("cogs", 0) / latest.get("revenue", 1)) * 100, 1)
    net_margin = round((latest.get("net", 0) / latest.get("revenue", 1)) * 100, 1)
    rev_change = round(((latest.get("revenue", 0) - previous.get("revenue", 1)) / previous.get("revenue", 1)) * 100, 1)
    open_anomalies = [a for a in anomalies if "resolved" not in a.get("status", "").lower()]
    context = f"""
Business: {profile.get("name")}
Owner: {profile.get("owner")}
Latest month: {latest.get("month")}
Revenue: ${latest.get("revenue", 0):,} ({rev_change:+}% vs prior month)
Net profit: ${latest.get("net", 0):,} ({net_margin}% margin)
Labour cost: {labour_pct}% of revenue (target: {profile.get("labour_cost_target")}%)
Food cost: {cogs_pct}% of revenue (target: {profile.get("food_cost_target")}%)

Active anomalies ({len(open_anomalies)} unresolved):
{chr(10).join(["- " + a["text"].strip()[:120] for a in open_anomalies[:3]])}
"""
    prompt = f"""You are Cortex, a private business advisor. Write a morning briefing for the business owner.

{context}

Rules:
- Write 2-3 sentences maximum. Be direct and specific.
- Lead with the most important thing they need to know today.
- If there is a clear problem, name it and give one concrete action.
- Do not use bullet points. Do not start with "Good morning". Write plain prose.
- Use the actual numbers from the data above.
"""
    try:
        response = ollama.chat(
            model="llama3.2",
            messages=[
                {"role": "system", "content": "You are a direct, no-nonsense business advisor. Be concise and specific."},
                {"role": "user", "content": prompt}
            ]
        )
        text = response["message"]["content"].strip()
    except Exception as e:
        text = f"Revenue for {latest.get('month')} was ${latest.get('revenue', 0):,} with a {net_margin}% net margin. Labour is at {labour_pct}% — {'above' if labour_pct > profile.get('labour_cost_target', 30) else 'within'} your {profile.get('labour_cost_target')}% target."
    _briefing_cache["text"] = text
    _briefing_cache["date"] = today
    return text

# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/status")
def status():
    files = get_vault_files()
    return {"status": "running", "vault_files": len(files), "model": "llama3.2"}

@app.get("/api/business")
def business():
    return parse_business_profile()

@app.get("/api/dashboard")
def dashboard():
    profile = parse_business_profile()
    months = parse_monthly_summary()
    metrics = compute_dashboard_metrics(months)
    anomalies = parse_anomalies()
    chart_data = [{"month": m["month"], "revenue": m["revenue"], "net": m["net"], "labour": m["labour"], "cogs": m["cogs"]} for m in months[-12:]]
    alerts = []
    for a in anomalies[:5]:
        text = a["text"].strip()
        status = a["status"]
        level = "critical"
        if "watch" in status.lower() or "monitor" in status.lower():
            level = "warning"
        elif "resolved" in status.lower():
            level = "info"
        alerts.append({"date": a["date"], "title": text[:60] + "..." if len(text) > 60 else text, "desc": text, "status": status, "level": level})
    return {"business": profile, "metrics": metrics, "chart": chart_data, "alerts": alerts}

@app.get("/api/alerts")
def get_alerts():
    return {"alerts": parse_anomalies()}

@app.get("/api/report")
def get_report():
    monthly = parse_monthly_summary()
    metrics = compute_dashboard_metrics(monthly)
    return {"period": monthly[-1].get("month", "") if monthly else "", "metrics": metrics, "monthly_history": monthly}

@app.get("/api/briefing")
def get_briefing():
    text = generate_briefing()
    return {"briefing": text, "date": _briefing_cache["date"]}

@app.post("/api/briefing/refresh")
def refresh_briefing():
    _briefing_cache["text"] = None
    _briefing_cache["date"] = None
    text = generate_briefing()
    return {"briefing": text}

@app.post("/api/ask")
def ask(query: Query):
    context = get_context_for_query(query.question)
    if query.save_note:
        save_owner_note(query.question)
    full_prompt = f"""
Here is everything I know about this business:

{context}

---

Owner's question: {query.question}
"""
    response = ollama.chat(
        model="llama3.2",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": full_prompt}
        ]
    )
    return {"answer": response["message"]["content"]}

@app.get("/api/quickbooks/connect")
def quickbooks_connect():
    from backend.connectors.quickbooks import get_auth_url
    return {"auth_url": get_auth_url()}

@app.get("/api/quickbooks/callback")
def quickbooks_callback(code: str, realmId: str):
    from backend.connectors.quickbooks import exchange_code_for_tokens
    exchange_code_for_tokens(code, realmId)
    return {"status": "connected", "realm_id": realmId}

@app.get("/api/quickbooks/status")
def quickbooks_status():
    from backend.connectors.quickbooks import load_tokens
    tokens = load_tokens()
    if tokens:
        return {"connected": True, "realm_id": tokens.get("realm_id")}
    return {"connected": False}

# ── Serve React frontend ──────────────────────────────────────────────────────
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/favicon.svg")
    def favicon():
        return FileResponse(os.path.join(FRONTEND_DIST, "favicon.svg"))

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

@app.get("/api/square/connect")
def square_connect():
    from backend.connectors.square import get_square_auth_url
    return {"auth_url": get_square_auth_url()}

@app.get("/api/square/callback")
def square_callback(code: str, state: str = ""):
    from backend.connectors.square import exchange_square_code
    tokens = exchange_square_code(code)
    return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

@app.get("/api/square/status")
def square_status():
    from backend.connectors.square import load_tokens
    tokens = load_tokens()
    if tokens and tokens.get("access_token"):
        return {"connected": True}
    return {"connected": False}

@app.post("/api/quickbooks/disconnect")
def quickbooks_disconnect():
    import os
    token_file = os.path.expanduser("~/cortex/quickbooks_tokens.json")
    if os.path.exists(token_file):
        os.remove(token_file)
    return {"status": "disconnected"}
