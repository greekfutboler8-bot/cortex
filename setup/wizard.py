import os
from datetime import datetime

VAULT_PATH = os.path.expanduser("~/CortexVault")

def write_file(relative_path, content):
    filepath = os.path.join(VAULT_PATH, relative_path)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Created: {relative_path}")

def ask(question, example=None):
    if example:
        print(f"\n{question}")
        print(f"Example: {example}")
    else:
        print(f"\n{question}")
    return input("> ").strip()

def run_wizard():
    print("\n" + "="*50)
    print("CORTEX SETUP WIZARD")
    print("="*50)
    print("Answer each question about the business.")
    print("This builds the foundation of the Business Brain.")
    print("="*50)

    # Basic info
    business_name = ask("What is the name of the business?")
    industry = ask(
        "What industry or type of business is this?",
        "Restaurant, retail shop, auto repair, salon..."
    )
    location = ask("What city and state is the business in?")
    years = ask("How many years has the business been operating?")
    employees_ft = ask("How many full-time employees?")
    employees_pt = ask("How many part-time employees?")

    # Financial context
    avg_monthly_revenue = ask(
        "Roughly what is the average monthly revenue?",
        "$50,000"
    )
    biggest_expense = ask(
        "What is the single biggest monthly expense?",
        "Labour, rent, inventory..."
    )

    # Seasonal patterns
    busy_months = ask(
        "What are the busiest months of the year?",
        "June, July, August"
    )
    slow_months = ask(
        "What are the slowest months of the year?",
        "January, February"
    )

    # Owner concerns
    concern_1 = ask(
        "What is the owner's biggest financial concern right now?",
        "Cash flow, rising costs, slow season coming up..."
    )
    concern_2 = ask(
        "Any other concerns or things Cortex should know about?",
        "Planning to expand, recently lost a big client..."
    )

    # Goals
    goal = ask(
        "What is the owner's main goal for the next 12 months?",
        "Increase profit margin, open a second location..."
    )

    # Write business profile
    profile = f"""# Business Profile
Last updated: {datetime.now().strftime("%Y-%m-%d")}

## Basic Information
- **Name:** {business_name}
- **Industry:** {industry}
- **Location:** {location}
- **Years in operation:** {years}
- **Full-time employees:** {employees_ft}
- **Part-time employees:** {employees_pt}

## Financial Overview
- **Average monthly revenue:** {avg_monthly_revenue}
- **Biggest monthly expense:** {biggest_expense}

## Owner Concerns
- {concern_1}
- {concern_2}

## Goals
- {goal}
"""

    # Write seasonal calendar
    seasonal = f"""# Seasonal Calendar
Last updated: {datetime.now().strftime("%Y-%m-%d")}

## Busy Periods
{busy_months}

## Slow Periods
{slow_months}

## Notes
Added at setup. Cortex will refine these patterns over time
as it learns from actual revenue data.
"""

    write_file("core/business-profile.md", profile)
    write_file("core/seasonal-calendar.md", seasonal)

    print("\n" + "="*50)
    print(f"Setup complete for {business_name}.")
    print("The Business Brain has been initialised.")
    print("="*50 + "\n")

if __name__ == "__main__":
    run_wizard()