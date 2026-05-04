from backend.memory.reader import read_relevant_files, read_all_files

TOPIC_MAP = {
    # Financial
    "cash":          ["cash-flow-patterns", "monthly-summary", "anomaly-log"],
    "revenue":       ["weekly-trends", "monthly-summary"],
    "expense":       ["expense-categories", "monthly-summary", "anomaly-log"],
    "cost":          ["expense-categories", "cash-flow-patterns", "monthly-summary"],
    "profit":        ["monthly-summary", "expense-categories"],
    "margin":        ["monthly-summary", "expense-categories", "anomaly-log"],
    "money":         ["monthly-summary", "cash-flow-patterns", "anomaly-log"],

    # Labour
    "labour":        ["expense-categories", "monthly-summary", "anomaly-log"],
    "labor":         ["expense-categories", "monthly-summary", "anomaly-log"],
    "staff":         ["expense-categories", "owner-conversations", "anomaly-log"],
    "employee":      ["expense-categories", "owner-conversations"],
    "hiring":        ["expense-categories", "owner-conversations", "anomaly-log"],
    "payroll":       ["expense-categories", "monthly-summary"],

    # Suppliers
    "supplier":      ["expense-categories", "owner-conversations", "anomaly-log"],
    "vendor":        ["expense-categories", "owner-conversations"],
    "acosta":        ["expense-categories", "owner-conversations", "anomaly-log"],
    "food cost":     ["expense-categories", "monthly-summary", "anomaly-log"],
    "ingredient":    ["expense-categories", "owner-conversations"],
    "price":         ["expense-categories", "owner-conversations", "anomaly-log"],
    "pricing":       ["expense-categories", "owner-conversations", "monthly-summary"],

    # Inventory
    "inventory":     ["stock-patterns", "expense-categories"],
    "stock":         ["stock-patterns"],
    "order":         ["stock-patterns", "expense-categories"],
    "product":       ["stock-patterns", "weekly-trends"],

    # Time / seasonal
    "forecast":      ["cash-flow-patterns", "weekly-trends", "seasonal-calendar", "prediction-log"],
    "predict":       ["prediction-log", "cash-flow-patterns", "seasonal-calendar"],
    "season":        ["seasonal-calendar", "weekly-trends", "monthly-summary"],
    "slow":          ["seasonal-calendar", "weekly-trends", "monthly-summary"],
    "busy":          ["seasonal-calendar", "weekly-trends"],
    "january":       ["seasonal-calendar", "monthly-summary", "prediction-log"],
    "february":      ["seasonal-calendar", "monthly-summary", "prediction-log"],
    "december":      ["seasonal-calendar", "monthly-summary", "weekly-trends"],
    "holiday":       ["seasonal-calendar", "weekly-trends", "monthly-summary"],
    "prepare":       ["seasonal-calendar", "prediction-log", "cash-flow-patterns"],

    # Day of week
    "day":           ["weekly-trends"],
    "week":          ["weekly-trends", "monthly-summary"],
    "tuesday":       ["weekly-trends", "anomaly-log"],
    "friday":        ["weekly-trends"],
    "weekend":       ["weekly-trends"],
    "night":         ["weekly-trends", "anomaly-log"],
    "best":          ["weekly-trends", "monthly-summary"],
    "worst":         ["weekly-trends", "anomaly-log"],
    "performing":    ["weekly-trends", "monthly-summary"],

    # Problems / alerts
    "anomaly":       ["anomaly-log", "expense-categories"],
    "warning":       ["anomaly-log", "prediction-log"],
    "problem":       ["anomaly-log", "monthly-summary", "expense-categories"],
    "issue":         ["anomaly-log", "expense-categories"],
    "worried":       ["anomaly-log", "expense-categories", "cash-flow-patterns"],
    "concern":       ["anomaly-log", "owner-conversations"],
    "risk":          ["anomaly-log", "prediction-log", "cash-flow-patterns"],

    # Business context
    "profile":       ["business-profile"],
    "history":       ["weekly-reports", "monthly-summary"],
    "report":        ["weekly-reports"],
    "owner":         ["owner-conversations", "business-profile"],
    "plan":          ["owner-conversations", "business-profile", "seasonal-calendar"],
    "expand":        ["owner-conversations", "monthly-summary"],
    "lunch":         ["owner-conversations", "weekly-trends"],
    "menu":          ["owner-conversations", "expense-categories"],
}

# Files to always include for grounding
ALWAYS_INCLUDE = [
    "business-profile",
    "anomaly-log",
]

def get_context_for_query(query):
    """
    Takes the owner's question, figures out which vault files
    are most relevant, and returns their contents for the LLM.
    Always includes core grounding files so the LLM never
    answers without basic business context.
    """
    query_lower = query.lower()
    topics = list(ALWAYS_INCLUDE)

    for keyword, files in TOPIC_MAP.items():
        if keyword in query_lower:
            topics.extend(files)

    # Remove duplicates while preserving order
    seen = set()
    unique_topics = []
    for t in topics:
        if t not in seen:
            seen.add(t)
            unique_topics.append(t)

    return read_relevant_files(unique_topics)