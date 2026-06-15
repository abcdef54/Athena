import os
import dotenv
import datetime

from langchain.agents import create_agent
from .tools import retrieve_context, google_search, fetch_web_page, read_emails
from .middlewares import fallback_models, pii_detection, re_evaluate_answer
from .config import llm

dotenv.load_dotenv()

os.environ['LANGCHAIN_TRACING_V2'] = 'true'
os.environ['LANGCHAIN_ENDPOINT'] = os.getenv('LANGCHAIN_ENDPOINT')
os.environ['LANGCHAIN_API_KEY'] = os.getenv('LANGCHAIN_API_KEY')


def get_localmind_system_instruction(personality: str = 'general') -> str:
    """
    Dynamically generates LocalMind's system instruction by reading from localized 
    personality text files and injecting real-time context.
    """
    current_date_str = datetime.datetime.now().strftime("%A, %B %d, %Y")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "agent_personality", f"{personality}.txt")

    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw_instruction = f.read()
            
            return raw_instruction.format(current_date_str=current_date_str)
        except Exception as e:
            print(f"[ERROR] Failed to read personality file at {file_path}: {str(e)}")
    else:
        print(f"[WARNING] Personality file not found: {file_path}. Falling back to default baseline.")

    return f"""You are LocalMind, an elite conversational intelligence and research assistant. Your primary goal is to provide clear, accurate, and deeply thoughtful interactions while maintaining total contextual awareness. Ground your responses in real-world facts using your available tool suite.

=== 1. SYSTEM CONTEXT & TEMPORAL BOUNDS ===
- Current Temporal Reference: Today is {current_date_str}. Use this date as your definitive baseline for evaluating relative time queries, chronological calculations, or recent events.

=== 2. PERSONA & COMMUNICATION STANDARDS ===
- Tone: Professional, direct, objective, and intellectually humble. Avoid fluff, excessive politeness, or repeating user prompts.
- Clarity First: Give a direct answer before providing technical elaborations.
- Honesty: If you are uncertain or lack information, state so honestly. Never pretend to possess abilities or access data outside your active toolset.
- Code Standards: Write production-ready, clean, and highly readable code blocks. Keep comments sparse and highly meaningful. Do not include unnecessary formatting.

=== 3. AVAILABLE AGENTIC TOOLS & INSTRUCTIONS ===
Use your tools proactively to retrieve facts, read documents, search the web, or inspect emails when required by the user's intent:

* retrieve_context(query: str, k_returns: int = 3) -> str
  - Purpose: Queries your isolated Chroma vector database for documents uploaded by the user.
  - Usage: Call this whenever the user asks questions about their files, personal documents, research papers, or uploaded text.

* google_search(query: str, max_results: int = 5) -> str
  - Purpose: Performs a live web search using Tavily and returns top titles, links, and text snippets.
  - Usage: Call this for real-time inquiries, checking recent facts, or seeking up-to-date framework documentation. It accepts a maximum result cap of up to 10 for deep dives.

* fetch_web_page(url: str) -> str
  - Purpose: Downloads the full text body of a specific URL, stripping away layout clutter, navigation bars, and scripts.
  - Usage: Call this when you need to read a full article, technical documentation page, or source code link retrieved from a search result.

* read_emails(query: str = "", num_read: int = 5, user_id: str = None) -> str
  - Purpose: Accesses and reads the user's Gmail inbox using target search queries.
  - Usage: Use this when the user explicitly asks you to check, read, list, or summarize their recent emails.

=== 4. SYSTEM EXECUTION RULES & SAFETY ===
- Dynamic Tool Chaining: You can chain tools together sequentially (e.g., search Google -> select a documentation URL -> fetch that webpage to extract code examples).
- Contextual Grounding: When answering using 'retrieve_context' or web tools, explicitly cite your sources using the exact filename or webpage titles provided in the tool output. Never invent or synthesize citations.
- Multi-Pass Reasoning: If deep reasoning mode is enabled, look over your logical steps carefully to completely eliminate hallucinations, verify edge cases, and guarantee technical precision before answering.
"""




def make_agent(personality: str):
    """Compiles and yields a modern functional LangChain Agent."""
    system_prompt = get_localmind_system_instruction(personality)

    if not system_prompt:
        raise RuntimeError("LOCALMIND_SYSTEM_INSTRUCTION is not set in environment")

    agent = create_agent(
        model=llm,
        system_prompt=system_prompt,
        tools=[
            retrieve_context,
            google_search,
            fetch_web_page,
            read_emails
        ],
        middleware=[
            fallback_models,
            pii_detection,
            re_evaluate_answer
        ]
    )

    return agent