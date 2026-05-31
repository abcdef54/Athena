# ✧ Athena — AI Chatbot Assistant (v2.0)

Athena is a premium, state-of-the-art, web-based conversational intelligence platform. Re-engineered in **Version 2.0 (v2.0)**, Athena integrates a modular, high-performance ES6 single-page frontend with an asynchronous FastAPI backend powered by LangChain and LangGraph cognitive workflows, isolated local Chroma vector store indexing (RAG), dynamic temporal prompting, Google Custom Search, and Gmail reading layers.

Athena features a responsive glassmorphic user interface designed to feel extremely premium, and persistent database memory via SQLAlchemy, PostgreSQL, and alembic migration controls.

> [!NOTE]
> This is **Version 2.0 (v2.0)** of the Athena platform. All core roadmap goals of Version 1.0—including multi-format file uploads, retrieval-augmented generation (RAG), custom agentic tool suites, and functional LangChain middleware critiques—have been successfully completed and verified under a comprehensive automated test framework.

---

## 🌟 Key Features

*   **Asynchronous LangChain Agentic Brain**: Leverages a highly-scalable, compiled model-agent pipeline enabling sequential multi-step tool reasoning, web search harvesting, and structured temporal constraints.
*   **Dynamic Temporal Contextualization**: Automatically injects a localized runtime calendar anchor (e.g. today's date, weekday, and year) into system prompts so the LLM remains contextually aware of temporal statements.
*   **Retrieval-Augmented Generation (RAG)**: Connects to a robust, thread-safe Chroma DB instance isolated by user ID, enabling seamless semantic indexing and vector similarity search across `.pdf`, `.docx`, `.md`, and `.txt` documents.
*   **Intelligent Citation & Source Mapping**: Extracts and deduplicates relevant document source hashes, mapping them dynamically inside the frontend user interface to show the exact source files cited in agent answers.
*   **Premium Glassmorphic Interface**: Organized as a modular ES6 single-page app utilizing fluid transitions, dynamic backdrop orbs, sleek scrollbars, responsive layouts, and full mobile-first viewports.
*   **Robust Multi-Provider Auth & Sessions**: Integrated with `FastAPI-Users` to manage JSON Web Token (JWT) local credentials along with a monkey-patched Google OAuth2 offline-access flow (ensuring reliable refresh token exchanges).
*   **Mid-Inference Middlewares**: Employs an extensible execution middleware pipeline supporting fallback LLM routing, active PII (Personally Identifiable Information) masking, and a custom multi-pass deep-thinking critique wrapper.
*   **Automated Pytest Suite**: Fully validated with a 100% passing green test suite containing 16 unit, integration, and mock endpoint test suites.

---

## 🛠️ Technology Stack

Athena is built using a clean, modern technology stack designed for optimal concurrency and extensibility:

### Frontend
- **Semantic HTML5**: Native elements for robust accessibility and SEO.
- **CSS3 (Vanilla CSS)**: Curated glassmorphism styles, fluid grids, premium orb backdrops, and active micro-animations.
- **ES6 JavaScript Modules**: Organized as a modular, classless client architecture separating routing (`api.js`), attachments (`attachments.js`), chat sessions (`chat.js`), state logic (`app.js`), auth lifecycle (`auth.js`), and responsive elements (`ui.js`).

### Backend
- **FastAPI**: Elite high-performance ASGI web framework.
- **SQLAlchemy (Async)**: Concurrency-driven database connection pool engine utilizing `asyncpg`.
- **Alembic**: Database versioning and migration controls.
- **LangChain / LangGraph**: Advanced AI cognitive workflows, tool definitions, and pregel middleware chains.
- **Chroma DB**: High-reliability vector store for localized document embeddings.

### Database
- **PostgreSQL**: Production-grade transactional repository for users, session threads, chat attachments, and secure OAuth tokens.

---

## 📁 Repository Structure

Below is the complete, high-fidelity directory tree of the Athena 2.0 repository:

```text
LocalMind/
├── .env                              # Local environmental variables & API secrets (ignored)
├── .gitignore                        # Extensive git ignore configuration
├── docker-compose.yaml               # Docker deployment setup
├── LICENSE                           # MIT License
├── main.py                           # Entry point to launch the FastAPI server
├── pytest.ini                        # Pytest runner configurations
├── README.md                         # Project documentation (Athena 2.0 Upgrade)
├── requirements.txt                  # Python environment packages
├── src/
│   ├── backend/                      # FastAPI Asynchronous Web Engine
│   │   ├── __init__.py
│   │   ├── app.py                    # Server instantiation, global middleware hooks, and app lifespan
│   │   ├── Dockerfile                # Container blueprint for backend
│   │   ├── agents/                   # Domain: Core AI Brain Mechanics
│   │   │   ├── __init__.py
│   │   │   ├── config.py             # LLM configurations, embeddings, and Chroma RAG ingestion
│   │   │   ├── core.py               # Functional LangChain agent compiler & temporal prompts
│   │   │   ├── middlewares.py        # Mid-inference layers (PII, fallback models, deep-thinking)
│   │   │   └── tools.py              # Custom Agent tools (retrieve_context, google_search, fetch_web_page, read_emails)
│   │   ├── auth/                     # Domain: Identity & Google API Permissions
│   │   │   ├── __init__.py
│   │   │   └── core.py               # GoogleOAuth2, JWT authentication strategy, token refresh flow
│   │   ├── database/                 # Domain: Data Persistence Layer
│   │   │   ├── __init__.py
│   │   │   ├── crud.py               # Data Access Object pattern for chats, attachments, messages
│   │   │   ├── exceptions.py         # Domain error definitions
│   │   │   ├── models.py             # SQLAlchemy declarative model schemas
│   │   │   ├── schemas.py            # Pydantic validation specs
│   │   │   └── session.py            # Async DB connection setup & Dependency Injection providers
│   │   └── routes/                   # REST API Router Endpoints
│   │       ├── chat.py               # Asynchronous agent invocation, history building, & source citations
│   │       ├── conversations.py      # Chat thread session CRUD management
│   │       └── uploads.py            # Safe file upload, physical storage writing, & Chroma embedding
│   ├── frontend/                     # Single Page Application (SPA) Client-Side Layer
│   │   ├── index.html                # Main HTML5 semantic structure (Dark Glassmorphic UI)
│   │   ├── css/                      # Vanilla CSS styling modules
│   │   │   ├── chat.css              # Conversation bubble, animations, & user-assistant cards
│   │   │   ├── glass.css             # Backdrop-filter styling, glow-orbs, & card containers
│   │   │   ├── main.css              # Root typography, color pallets, scrollbars, & layouts
│   │   │   ├── responsive.css        # Viewport adjustment rules for mobile & tablet layouts
│   │   │   └── sidebar.css           # Navigation links, thread listings, & header components
│   │   └── js/                       # Modular ES6 Javascript architecture
│   │       ├── api.js                # REST Client fetching /chat, /conversation, /uploads, /auth
│   │       ├── app.js                # Client-side core coordinator & event dispatching loop
│   │       ├── attachments.js        # Frontend handler for uploading, displaying & deleting documents
│   │       ├── auth.js               # OAuth redirect controllers & current user sync actions
│   │       ├── chat.js               # Chat rendering, typewriter effects, & dynamic citations
│   │       ├── conversations.js      # Thread switching, list fetching, and creation handlers
│   │       └── ui.js                 # Orbs movements, sidebar collapses, and loading overlays
│   └── uploads/                      # Local runtime upload folder (ignored in git)
│       └── chroma/                   # Chroma vector db directories indexed by user UUID (ignored in git)
└── tests/                            # Automated Pytest Suite
    ├── conftest.py                   # Global DB/OAuth isolation mock setups & fixtures
    ├── test_agents.py                # Testing agent compiles, tools routing & deep-thinking mid-inference
    ├── test_database_crud.py         # Database transaction coverage (conversations, attachments, user schemas)
    ├── test_routes_auth.py           # Auth endpoint registry and jwt verification testing
    ├── test_routes_chat.py           # End-to-end chat endpoint invocation tests
    ├── test_routes_conversations.py  # Chat list and thread query authorization testing
    └── test_routes_uploads.py        # Secure multi-provider file upload validation tests
```

---

## 🚀 Getting Started

### 1. Database Configuration
Before booting up the backend, ensure you have a running PostgreSQL instance:
1. Create a database named `athena_db`.
2. Configure your connection string in `.env`:
   ```ini
   POSTGRESQL_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/athena_db"
   ```

### 2. Environment Variables (`.env`)
Create a `.env` file in the project root with the following configuration layout:
```ini
# LLM Endpoint & Provider Options
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"
GOOGLE_API_KEY = "your-gemini-api-key"
GOOGLE_GENERATIVE_AI_MODEL_NAME = "gemini-3.1-flash-lite"
GOOGLE_EMBEDDING_MODEL_NAME = "gemini-embedding-001"

# Tavily Search API
TAVILY_KEY = "your-tavily-key"

# Google Custom Search API (Alternative tool)
GOOGLE_SEARCH_AND_MAIL_API = "your-custom-search-api-key"
GOOGLE_CSE_ID = "https://cse.google.com/cse.js?cx=your-cx-id"

# LangSmith Tracing configurations
LANGCHAIN_API_KEY = "your-langchain-api-key"
LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com"

# PostgreSQL and JWT setups
POSTGRESQL_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/athena_db"
JWT_SECRET_KEY = "your-secure-jwt-secret-string"
```

### 3. Backend Setup
1. Standard Python environments (Python 3.10+ recommended) should be launched:
   ```bash
   # Create a virtual environment
   python -m venv .venv
   
   # Activate on Windows:
   .venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```
2. Run database migrations:
   ```bash
   alembic upgrade head
   ```
3. Launch the server using the entrypoint:
   ```bash
   python main.py
   ```
   *The backend server runs on `http://127.0.0.1:8000` with hot-reloading active.*

### 4. Running the Tests
To verify all routers, agent chains, tool integrations, and ORM pipelines, execute:
```bash
pytest -v
```

### 5. Frontend Launch
Athena is built entirely on client-side modules:
*   Serve the `src/frontend/` folder using any lightweight web server. For example:
    ```bash
    python -m http.server 5500
    ```
*   Access `http://127.0.0.1:5500/src/frontend/index.html` in your web browser.

---

## 🔌 API Reference

| Domain | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/auth/register` | `POST` | Register a new user with standard credentials. |
| **Auth** | `/auth/jwt/login` | `POST` | Authenticate credentials and receive a secure JWT token. |
| **Auth** | `/auth/google/authorize` | `GET` | Initiates the Google OAuth authorization redirect. |
| **Auth** | `/auth/google/callback` | `GET` | Exchanges code for persistent user profile and workspace tokens. |
| **User** | `/users/me` | `GET` | Fetches active user session profile details. |
| **Chat** | `/chat` | `POST` | Dispatch prompt message, invokes LangChain agent, saves records, returns reply. |
| **Chat** | `/chat/regenerate` | `POST` | Re-evaluates assistant reply, utilizing deep thinking critique. |
| **Threads** | `/conversation` | `POST` | Initialize a new conversational session and thread. |
| **Threads** | `/conversation` | `GET` | Fetches all active conversation threads sorted descending. |
| **Threads** | `/conversation/{id}/messages` | `GET` | Retrieves full message transcript timeline for a thread. |
| **Uploads** | `/uploads/conversation/{id}` | `POST` | Upload and securely ingest a text, docx, or pdf document. |
| **Uploads** | `/uploads/conversation/{id}` | `GET` | Lists all active document attachments linked to a thread. |
| **Uploads** | `/uploads/{attachment_id}` | `DELETE` | Removes file record and cleans Chroma vector indices. |

---

## 📅 Roadmap & Next Steps

Following the completion of Athena 2.0, our development cycle focuses on the next major iteration (**Version 3.0**):

1. 🎙️ **Latex Support**: 

    * Add comprehensive LaTeX mathematical notation support to the frontend, enabling:
    * Automatic detection of LaTeX expressions (e.g., `$E=mc^2$`, `$\frac{d}{dx}`)
    * Real-time rendering of math formulas using KaTeX or MathJax
    * Preserve LaTeX syntax in chat history and file uploads

2. **Code Support**:
    * Add comprehensive code block support to the frontend, enabling:
    * Automatic detection of code blocks (e.g., ```python ... ```, ```java ... ```)
    * Real-time syntax highlighting for multiple programming languages
    * Copy code to clipboard functionality
    * Preserve code syntax in chat history and file uploads