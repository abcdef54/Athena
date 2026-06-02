# ✧ Athena — Conversational AI Platform

Athena is a high-performance conversational intelligence platform. The system integrates an asynchronous **FastAPI** backend driven by LangChain and LangGraph cognitive workflows, a highly secure multi-tenant session manager, and an isolated **Chroma Vector DB** retrieval-augmented generation (RAG) indexing pipeline. The frontend is built as a lightweight, responsive ES6 single-page application utilizing fluid glass panels with blur effects and dynamic wallpaper options.

## 📺 Application Demo

[![Demo Video](https://img.shields.io/badge/▶_Watch_Demo_Video-Click_Here-blue?style=for-the-badge&logo=youtube)](https://github.com/user-attachments/assets/cb7cbb49-3660-4212-8465-575974ce86c8)

> [!IMPORTANT]
> The Athena project is now complete. This is the final stable version (v3.2.6), and no further updates or active development are planned.

---

## 🌟 Core Features

*   **Asynchronous LangChain Agentic Brain**: Leverages a highly scalable backend enabling multi-step tool reasoning with LangChain and LangGraph cognitive workflows, dynamically routing Google Search, contextual document queries, email reading, and URL contents fetching.

*   **Multi-Tenant RAG Pipeline (Chroma DB)**: Connects to a robust, thread-safe local Chroma vector database isolated by user ID, supporting parsing, indexing, oversampling, content deduplication, and vector similarity search across `.pdf`, `.docx`, `.md`, `.txt` files, and also fully supports raw code files (`.py`, `.js`, `.ts`, `.c`, `.cpp`, `.html`, `.css`).

*   **Isolated Ingestion & Uploads**: Supports drag-and-drop document ingestion, managing files locally or linking directly to Google Drive, ensuring safe storage, indexation, and vector cleanups.

*   **Persistent Conversation Memory**: Retains session history across logical thread channels, enabling contextual follow-up turns backed by robust PostgreSQL and async SQLAlchemy memory caches.

*   **Secure Multi-Provider Auth & Storage**: Integrated with standard local JWT credentials and offline Google OAuth scopes, defaulting documents storage to Google Drive with Local Storage fallbacks.

*   **Math & Syntax Rendering Engine**: Handles real-time client-side compilation of KaTeX display math, inline formulas (with currency guards), and Highlight.js programming code syntax with Copy-to-Clipboard hooks.

*   **Lightweight Glass Design**: Organized as a responsive Single Page App utilizing fluid glass panels, Dynamic Island center titles, absolute-positioned mobile controls, and standard-setting clearing margins.

*   **Soft-Delete DB Architecture**: Implements logical SQLAlchemy and PostgreSQL `deleted_at` cascade soft-delete timestamps, ensuring robust user data integrity and thread history retention.

---

## 📈 Version History

Athena has evolved through key development stages to reach its final production-ready state:

*   **Athena v1.0 (The Foundation)**: Minimal single-page chat interface supporting basic conversational exchanges and active session in-memory context retention.
*   **Athena v2.0 (Identity & RAG Framework)**: Decoupled client-server architecture introducing JWT Local Auth, Google OAuth2 handshakes, document upload drawers, isolated Chroma vector search, and footnote citations.
*   **Athena v2.2 (Soft-Delete Migration)**: Auditable data persistence using logical `deleted_at` cascades across SQLAlchemy database models.
*   **Athena v3.0 (Rich Formatting)**: Rich educational rendering including KaTeX LaTeX mathematical notations, Highlight.js code editors, and Copy-to-Clipboard glass overlays.
*   **Athena v3.1 & v3.1.1 (Tables & Tools Showcase)**: Added pipe-delimited grid-table support with scroll controls, and an Agent Tools drawer displaying modular workflows.
*   **Athena v3.2 & v3.2.1 (Refinement & Standardizations)**: Transitioned UI to a lightweight glass design with dynamic wallpapers.
*   **Athena v3.2.5 (Lazy Threads, Code RAG & Personalities)**: Introduced lazy conversation generation (thread database allocation on first prompt), raw code file ingestion (`.py`, `.js`, `.ts`, `.c`, `.cpp`, `.html`, `.css`) to the RAG pipeline, a standalone local `👤 Human` conversational personality, and user free usage limit enforcement.
*   **Athena v3.2.6 (Multi-File Ingest & Watcher fixes) [LATEST]**: Added synchronous file buffer caching to prevent transient DataTransfer handle invalidations on drag-and-drop, isolated local file storage and Chroma database vectors into a hidden project-root `.uploads/` directory to prevent editor live-reload restarts, and installed missing `docx2txt` / `python-docx` parsing requirements in the python execution environment.

---

## 🛠️ Technology Stack

Athena is built using a clean, modern, and highly modular technology stack designed for optimal concurrency and extensibility:

### Frontend
- **HTML5 (Semantic UI)**: Semantic elements for structural layout, accessibility, and high-fidelity indexing.
- **CSS3 (Vanilla CSS)**: Curated Liquid Glass parameters, fluid grid layouts, and active micro-animations.
- **ES6 JavaScript Modules**: Organized as a classless client architecture separating routing ([api.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/api.js)), RAG documents ([attachments.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/attachments.js)), chat states ([chat.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/chat.js)), auth lifecycles ([auth.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/auth.js)), thread logic ([conversations.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/conversations.js)), and DOM/popovers ([ui.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/ui.js)).

### Backend
- **Python**: Core programming language.
- **FastAPI**: Asynchronous high-performance web framework.
- **FastAPI-Users**: User management system enforcing JSON Web Tokens (JWT) authentication strategy.
- **Google OAuth2**: Multi-provider authentication and file workspace offline scope synchronization.
- **SQLAlchemy (Async)**: Concurrency-driven database connection pool engine utilizing `asyncpg`.
- **Alembic**: Database schema migrations control.
- **LangChain / LangGraph**: Advanced AI cognitive workflows, tool mappings, and pregel middleware chains.
- **Chroma DB**: Isolated localized document vector store indexes.

### Database
- **PostgreSQL**: Production-grade transactional repository for users, logical session threads, chat attachments, and secure OAuth tokens.

### Deployment & DevOps
- **Docker**: Containerization engine isolating the Python/FastAPI backend runtime and static asset serving environments.
- **Docker Compose**: Multi-container orchestration networking the isolated Database, Backend, and Frontend service dependencies into a unified, single-command deployment stack.

---

## 📁 Repository Structure

Below is the complete, high-fidelity directory tree of the finalized Athena repository:

```text
LocalMind/
├── .env                              # Local environmental variables & API secrets (ignored)
├── .gitignore                        # Extensive git ignore configuration
├── docker-compose.yaml               # Docker deployment setup
├── LICENSE                           # MIT License
├── main.py                           # Entry point to launch the FastAPI server
├── pytest.ini                        # Pytest runner configurations
├── README.md                         # Project documentation (Athena Final Release)
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
│   │   │   ├── crud.py               # Data Access Object pattern for chats, attachments, messages (Soft-Delete)
│   │   │   ├── exceptions.py         # Domain error definitions
│   │   │   ├── models.py             # SQLAlchemy declarative model schemas (Soft-Delete timestamps)
│   │   │   ├── schemas.py            # Pydantic validation specs
│   │   │   └── session.py            # Async DB connection setup & Dependency Injection providers
│   │   └── routes/                   # REST API Router Endpoints
│   │       ├── chat.py               # Asynchronous agent invocation, history building, & source citations
│   │       ├── conversations.py      # Chat thread session CRUD management
│   │       └── uploads.py            # Safe file upload, physical storage writing, & Chroma embedding
│   └── frontend/                     # Single Page Application (SPA) Client-Side Layer
│       ├── index.html                # Main HTML5 semantic structure (Liquid Glass UI)
│       ├── css/                      # Vanilla CSS styling modules
│       │   ├── chat.css              # Conversation bubbles, input bar, & scrolling paddings
│       │   ├── glass.css             # Backdrop-filter styling, glow-orbs, custom dropdowns, & tool popups
│       │   ├── main.css              # Root typography, auth overlays, drawers, & layout grids
│       │   ├── responsive.css        # Viewport adjustment rules for mobile & tablet layouts
│       │   └── sidebar.css           # Navigation lists, thread cards, active indicators, and logo
│       ├── images/                   # High-contrast dynamic wallpaper assets
│       │   ├── Aerial photography of concrete roads-original.jpg
│       │   ├── Blue and brown steel bridge-original.jpg
│       │   ├── Church Dome Cathedral-original.jpg
│       │   ├── Duck Bird Grass-original.jpg
│       │   └── Rock formation on body of water-large.jpg
│       └── js/                       # Modular ES6 Javascript architecture
│           ├── api.js                # REST Client fetching /chat, /conversation, /uploads, /auth
│           ├── app.js                # Client-side core coordinator, wallpaper & dropdown engines
│           ├── attachments.js        # Drag-and-drop uploader & storage provider toggle triggers
│           ├── auth.js               # OAuth redirect controllers & current user sync actions
│           ├── chat.js               # Message timelines, custom typing loaders, & citation lists
│           ├── conversations.js      # Thread CRUD management & list re-rendering
│           └── ui.js                 # Toast notifications, popovers, and drawer animations
├── tests/                            # Automated Pytest Suite
│   ├── conftest.py                   # Global DB/OAuth isolation mock setups & fixtures
│   ├── test_agents.py                # Testing agent compiles, tools routing & deep-thinking mid-inference
│   ├── test_database_crud.py         # Database transaction coverage (conversations, attachments, user schemas)
│   ├── test_routes_auth.py           # Auth endpoint registry and jwt verification testing
│   ├── test_routes_chat.py           # End-to-end chat endpoint invocation tests
│   ├── test_routes_conversations.py  # Chat list and thread query authorization testing
│   └── test_routes_uploads.py        # Secure multi-provider file upload validation tests
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
Create a `.env` file in the project root. Below are the configurations divided by their necessity:

#### Required Keys (Core System)
```ini
# PostgreSQL database connection URL
POSTGRESQL_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/athena_db"

# Core application encryption key for JWT credentials session validation
JWT_SECRET_KEY = "your-secure-jwt-secret-string"

# Google Gemini API key and model bindings
GOOGLE_API_KEY = "your-gemini-api-key"
GOOGLE_GENERATIVE_AI_MODEL_NAME = "gemini-1.5-flash"
GOOGLE_EMBEDDING_MODEL_NAME = "text-embedding-004"
```

#### Optional Keys (Integrations & Diagnostics)
```ini
# Google OAuth 2.0 Credentials (Optional: required only for Google Identity flow)
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"

# Tavily Search Engine API (Optional: enables modular web search tools)
TAVILY_KEY = "your-tavily-key"

# AI Inference Fallbacks (Optional: comma-separated list of secondary models)
GOOGLE_GENEATIVE_AI_FALLBACK_MODELS = "gemini-1.5-pro,gemini-1.0-pro"

# LangSmith / LangChain Tracing (Optional: only needed for logging and diagnostic analytics)
LANGCHAIN_API_KEY = "your-langchain-api-key"
LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com"
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

### 6. Docker-Compose Setup (Alternative & Recommended)
If you prefer to run the entire stack (PostgreSQL Database, FastAPI Backend, and Nginx Frontend) in containerized environments with a single command:

1. **Ensure Docker is running** on your system.
2. **Create the `.env` file** in the project root containing your required credentials (as specified in step 2).
3. **Start all services** in built/hot-reload mode:
   ```bash
   docker-compose up --build
   ```
4. **Access the application**:
   - **Frontend UI Client**: `http://localhost:5500` (served via Nginx container)
   - **FastAPI API Server**: `http://localhost:8000` (served via Uvicorn backend container)
   - **PostgreSQL Database**: Port `5433` maps to database container port `5432` locally (so you can inspect it with PgAdmin or DBeaver using password `admin` and username `postgres`).

To stop and remove all container resources, networks, and configurations:
```bash
docker-compose down
```

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
| **Threads** | `/conversation` | `GET` | Fetches all active conversation threads sorted descending (excludes soft-deletes). |
| **Threads** | `/conversation/{id}/messages` | `GET` | Retrieves full message transcript timeline for a thread (excludes soft-deletes). |
| **Uploads** | `/uploads/conversation/{id}` | `POST` | Upload and securely ingest a text, docx, or pdf document. |
| **Uploads** | `/uploads/conversation/{id}` | `GET` | Lists all active document attachments linked to a thread. |
| **Uploads** | `/uploads/{attachment_id}` | `DELETE` | Removes file record, cleans local/Google Drive files, and purges Chroma vector indices. |