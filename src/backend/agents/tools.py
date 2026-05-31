import os
import dotenv
import requests
import httpx
import asyncio

from bs4 import BeautifulSoup
from googleapiclient.discovery import build
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from langchain_community.tools import TavilySearchResults
from pydantic import BaseModel, Field
from src.backend.database.session import async_session_maker
from src.backend.auth import get_google_credentials
from .config import query_embedding_model, _get_user_vector_store

dotenv.load_dotenv()




class RetrieveContextInput(BaseModel):
    query: str = Field(description="The search query to retrieve context for.")
    k_returns: int = Field(default=3, description="Number of documents to return.")

@tool(args_schema=RetrieveContextInput, response_format="content_and_artifact")
async def retrieve_context(
    query: str, 
    k_returns: int = 3, 
    runnable_config: RunnableConfig = ...
) -> tuple[str, list]:
    """
    Queries your isolated personal knowledge documents (PDFs, Docx, Markdown) 
    uploaded in this conversation to retrieve context needed to answer questions accurately.
    """
    actual_config = runnable_config if runnable_config is not ... else None
    print(f"\n[DEBUG retrieve_context] Starting context retrieval...")
    print(f"  - query: '{query}'")
    print(f"  - k_returns: {k_returns}")
    print(f"  - runnable_config type: {type(runnable_config)}")
    print(f"  - runnable_config: {runnable_config}")
    print(f"  - actual_config type: {type(actual_config)}")
    print(f"  - actual_config: {actual_config}")

    configurable = actual_config.get("configurable", {}) if actual_config else {}
    user_id = configurable.get("user_id")
    print(f"  - user_id from config: '{user_id}'")

    if not user_id:
        print("[DEBUG retrieve_context] ERROR: user_id is missing from runnable configuration!")
        return "System Error: Missing secure user contextual token identifier. Cannot query documents.", []

    loop = asyncio.get_running_loop()
    
    try:
        print(f"[DEBUG retrieve_context] Loading vector store and generating embeddings query...")
        vector_store, embedded_query = await asyncio.gather(
            loop.run_in_executor(None, _get_user_vector_store, user_id),
            loop.run_in_executor(None, query_embedding_model.embed_query, query)
        )
        print(f"[DEBUG retrieve_context] Vector store loaded. Path: {vector_store._persist_directory if hasattr(vector_store, '_persist_directory') else 'Unknown'}")
        print(f"[DEBUG retrieve_context] Embedded query vector generated successfully (dims: {len(embedded_query)}).")

        # Fetch more candidates to allow deduplication of duplicates from multiple uploads
        candidate_k = max(k_returns * 4, 12)
        print(f"[DEBUG retrieve_context] Executing similarity search in Chroma with candidate limit k={candidate_k}...")
        raw_docs = await loop.run_in_executor(
            None, 
            lambda: vector_store.similarity_search_by_vector(embedded_query, k=candidate_k)
        )
        
        # Deduplicate candidates based on content text to eliminate identical chunks from multiple duplicate uploads
        seen_content = set()
        retrieved_docs = []
        for doc in raw_docs:
            content_hash = doc.page_content.strip()
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                retrieved_docs.append(doc)
                if len(retrieved_docs) >= k_returns:
                    break
        
        print(f"[DEBUG retrieve_context] Similarity search finished. Found {len(raw_docs)} raw results. Deduplicated to {len(retrieved_docs)} unique chunks.")
        
        for i, doc in enumerate(retrieved_docs):
            print(f"  - Unique Result [{i}]: source='{doc.metadata.get('source')}', length={len(doc.page_content)} chars")

        serialized = "\n\n".join(
            f"Source: {os.path.basename(doc.metadata.get('source', 'Unknown'))}\nContent: {doc.page_content}"
            for doc in retrieved_docs
        )

        return serialized, retrieved_docs
    except Exception as e:
        import traceback
        print(f"[DEBUG retrieve_context] CRITICAL EXCEPTION inside context retrieval:")
        traceback.print_exc()
        return f"Error querying context: {str(e)}", []


@tool
async def google_search(query: str, max_results: int = 5) -> str:
    """
    Searches the internet for the given query and returns live web results 
    including titles, text snippets, and source links. 
    
    Use a higher 'max_results' (up to 10) if the query requires deep, comprehensive 
    research or cross-referencing multiple viewpoints.
    """
    tavily_key = os.getenv('TAVILY_KEY')
    if not tavily_key:
        print("[Search Tool Warning]: TAVILY_API_KEY is missing from environment variables.")
        return "Error: Web search engine is currently unconfigured. Missing API credentials."

    try:
        # FIX: Explicitly passing the key into the tool constructor so it actually gets used!
        search_tool = TavilySearchResults(
            tavily_api_key=tavily_key,
            max_results=min(max(max_results, 1), 10)
        )
        
        results = await search_tool.ainvoke({"query": query})
        
        if not results:
            print(f"No results found for query: '{query}'")
            return f"Search completed, but no relevant results were found for: '{query}'"
        
        formatted_results = []
        for i, res in enumerate(results, start=1):
            title = res.get('title', f"Web Result {i}")
            snippet = res.get('content', '(No snippet text available)')
            link = res.get('url', '(No link available)')
            
            result_block = f"Title: {title}\nSnippet: {snippet}\nLink: {link}"
            formatted_results.append(result_block)
            
        final_output = "\n\n---\n\n".join(formatted_results)
        print(f"[Search Success] Captured {len(formatted_results)} results for query: '{query}'")
        
        return final_output

    except Exception as e:
        error_msg = f"An error occurred while executing the web search: {str(e)}"
        print(f"[Search Failure] {error_msg}")
        return error_msg


@tool
async def fetch_web_page(url: str) -> str:
    """
    Navigates to a specific URL link, downloads the webpage content,
    strips away layout clutter, and extracts the core readable text body.
    Useful when you need to read a full article, documentation page, or source link.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")

        for element in soup(["script", "style", "nav", "footer", "header", "form", "aside"]):
            element.decompose()

        main_content = soup.find("article") or soup.find("main") or soup.find("body")

        if not main_content:
            return "The webpage loaded successfully but contained no extractable textual content."

        chunks = (
            phrase.strip()
            for line in main_content.get_text().splitlines()
            for phrase in line.split("  ")
        )
        clean_text = "\n".join(chunk for chunk in chunks if chunk)

        if not clean_text:
            return "The webpage loaded successfully but contained no extractable textual content."

        MAX_CHARS = 12000
        if len(clean_text) > MAX_CHARS:
            cutoff = clean_text.rfind("\n", 0, MAX_CHARS)
            cutoff = cutoff if cutoff != -1 else MAX_CHARS
            return (
                f"[WARNING: Content truncated for size constraints]\n\n"
                f"{clean_text[:cutoff]}\n\n"
                f"... [Truncated remaining {len(clean_text) - cutoff} characters]"
            )

        return clean_text

    except httpx.TimeoutException:
        return "Error: The target server took too long to respond. Connection timed out."
    except httpx.HTTPStatusError as e:
        return f"HTTP error {e.response.status_code} returned while fetching page: {url}"
    except Exception as e:
        return f"An error occurred while attempting to parse the page link: {str(e)}"


@tool
async def read_emails(
    query: str = "", 
    num_read: int = 5, 
    user_id: str = None,
    runnable_config: RunnableConfig = ...
) -> str:
    """
    Search and read the user's Gmail inbox. 
    The 'query' parameter uses standard Gmail search operators (e.g., 'from:name', 'is:unread', 'subject:urgent').
    Leave query empty to simply fetch the most recent emails.
    """
    actual_config = runnable_config if runnable_config is not ... else None
    print(f"\n[DEBUG read_emails] Starting email retrieval...")
    print(f"  - query: '{query}'")
    print(f"  - num_read: {num_read}")
    print(f"  - user_id (arg): '{user_id}'")
    print(f"  - runnable_config type: {type(runnable_config)}")
    print(f"  - runnable_config: {runnable_config}")

    if not user_id and actual_config:
        configurable = actual_config.get("configurable", {})
        user_id = configurable.get("user_id")
        print(f"  - Resolved user_id from config: '{user_id}'")

    if not user_id:
        print("[DEBUG read_emails] ERROR: user_id could not be resolved from arguments or config!")
        return "Error: System failed to securely pass the contextual user session identifier."
    
    try:
        print("[DEBUG read_emails] Opening database session and loading Google OAuth credentials...")
        async with async_session_maker() as session:
            creds = await get_google_credentials(user_id, session)
        print("[DEBUG read_emails] Google OAuth credentials successfully retrieved.")
        
        loop = asyncio.get_running_loop()

        def fetch_email_sync():
            print("[DEBUG read_emails] Building Gmail API service connection...")
            service = build('gmail', 'v1', credentials=creds)
            
            print(f"[DEBUG read_emails] Listing user messages (q='{query}', limit={num_read})...")
            results = service.users().messages().list(
                userId='me', 
                maxResults=num_read, 
                q=query
            ).execute()

            messages = results.get('messages', [])
            print(f"[DEBUG read_emails] Found {len(messages)} raw email messages.")
            if not messages:
                return f"No emails found matching the search criteria: '{query}'" if query else "Your inbox is completely empty."
            
            email_summaries = []
            for i, msg in enumerate(messages):
                print(f"[DEBUG read_emails] Fetching message detail [{i}] ID: {msg['id']}...")
                full_msg = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()

                payload = full_msg.get('payload', {})
                headers = payload.get('headers', [])

                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), '(No Subject)')
                sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), '(Unknown Sender)')
                snippet = full_msg.get('snippet', '')
                
                print(f"  - Email [{i}]: FROM='{sender}', SUBJECT='{subject}', Snippet: '{snippet[:40]}...'")
                
                summary = f"[ID: {msg['id']}]\nFROM: {sender}\nSUBJECT: {subject}\nSUMMARY: {snippet}"
                email_summaries.append(summary)
            
            return "\n\n---\n\n".join(email_summaries)
        
        messages = await loop.run_in_executor(None, fetch_email_sync)
        print("[DEBUG read_emails] Email summaries successfully retrieved.")
        return messages
    except Exception as e:
        import traceback
        print(f"[DEBUG read_emails] CRITICAL EXCEPTION inside email retrieval:")
        traceback.print_exc()
        return f"Failed to retrieve message logs safely from Gmail API service: {str(e)}"