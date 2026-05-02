import os

VAULT_PATH = os.path.expanduser("~/CortexVault")

def get_vault_files():
    """Returns a list of all markdown files in the vault."""
    files = []
    for root, dirs, filenames in os.walk(VAULT_PATH):
        for filename in filenames:
            if filename.endswith(".md"):
                files.append(os.path.join(root, filename))
    return files

def read_file(filepath):
    """Reads a single vault file and returns its contents."""
    with open(filepath, "r") as f:
        return f.read()

def read_relevant_files(topics):
    """
    Given a list of topics, returns the contents of the most
    relevant vault files as a single string for the LLM to read.
    """
    all_files = get_vault_files()
    relevant = []

    for filepath in all_files:
        for topic in topics:
            if topic.lower() in filepath.lower():
                content = read_file(filepath)
                filename = os.path.basename(filepath)
                relevant.append(f"## {filename}\n\n{content}")
                break

    if not relevant:
        for filepath in all_files:
            content = read_file(filepath)
            filename = os.path.basename(filepath)
            relevant.append(f"## {filename}\n\n{content}")

    return "\n\n---\n\n".join(relevant)

def read_all_files():
    """Reads every file in the vault and returns as one string."""
    all_files = get_vault_files()
    result = []
    for filepath in all_files:
        content = read_file(filepath)
        filename = os.path.basename(filepath)
        result.append(f"## {filename}\n\n{content}")
    return "\n\n---\n\n".join(result)