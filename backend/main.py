from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.memory.rag import get_context_for_query
from backend.memory.writer import save_owner_note, save_anomaly

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/")
def root():
    return {"status": "Cortex is running"}

@app.post("/ask")
def ask(query: Query):
    """Takes a question, pulls relevant vault context, asks Ollama."""
    
    # Get relevant vault files for this question
    context = get_context_for_query(query.question)
    
    # If the owner is telling us something rather than asking,
    # save it to the vault
    if query.save_note:
        save_owner_note(query.question)
    
    # Build the full prompt
    full_prompt = f"""
Here is everything I know about this business:

{context}

---

Owner's question: {query.question}
"""
    
    # Send to Ollama
    response = ollama.chat(
        model="llama3.2",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": full_prompt}
        ]
    )
    
    answer = response["message"]["content"]
    
    return {"answer": answer}

@app.get("/status")
def status():
    """Returns basic vault status."""
    from backend.memory.reader import get_vault_files
    files = get_vault_files()
    return {
        "status": "running",
        "vault_files": len(files),
        "model": "llama3.2"
    }