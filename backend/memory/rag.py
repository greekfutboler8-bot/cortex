from backend.memory.reader import read_relevant_files, read_all_files

TOPIC_MAP = {
    "cash":        ["cash-flow-patterns", "monthly-summary"],
    "revenue":     ["weekly-trends", "monthly-summary"],
    "expense":     ["expense-categories", "monthly-summary"],
    "cost":        ["expense-categories", "cash-flow-patterns"],
    "labour":      ["expense-categories", "monthly-summary"],
    "staff":       ["expense-categories", "owner-conversations"],
    "inventory":   ["stock-patterns"],
    "stock":       ["stock-patterns"],
    "forecast":    ["cash-flow-patterns", "weekly-trends", "seasonal-calendar"],
    "predict":     ["prediction-log", "cash-flow-patterns"],
    "season":      ["seasonal-calendar", "weekly-trends"],
    "slow":        ["seasonal-calendar", "weekly-trends"],
    "supplier":    ["expense-categories", "owner-conversations"],
    "anomaly":     ["anomaly-log"],
    "warning":     ["anomaly-log", "prediction-log"],
    "profile":     ["business-profile"],
    "history":     ["weekly-reports"],
    "report":      ["weekly-reports"],
}

def get_context_for_query(query):
    """
    Takes the owner's question, figures out which vault files
    are most relevant, and returns their contents for the LLM.
    """
    query_lower = query.lower()
    topics = []

    for keyword, files in TOPIC_MAP.items():
        if keyword in query_lower:
            topics.extend(files)

    # Remove duplicates
    topics = list(set(topics))

    if topics:
        return read_relevant_files(topics)
    else:
        # If no specific topic matched, read the core files
        return read_relevant_files([
            "business-profile",
            "monthly-summary",
            "anomaly-log",
            "owner-conversations"
        ])