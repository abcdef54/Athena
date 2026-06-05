# Athena — Conversational AI Platform

Athena is a conversational AI platform built with FastAPI, LangChain, LangGraph, PostgreSQL, and ChromaDB. The project combines asynchronous agent workflows, retrieval-augmented generation (RAG), multi-provider authentication, and persistent conversation management within a containerized architecture.

The backend is powered by FastAPI and LangGraph-based agent workflows, while the frontend is implemented as a lightweight ES6 single-page application focused on responsiveness and simplicity. Athena was developed as both a functional AI application and a practical exploration of modern backend engineering, AI orchestration, and software architecture.

### Purpose & Core Philosophy

> **Note**: Athena is a student solo project developed as a practical deep dive into modern AI application development and backend architecture. Many of the technologies used throughout the system were learned during the project's development, making Athena both a functional conversational AI platform and a comprehensive learning experience spanning authentication, databases, RAG pipelines, agent orchestration, and containerized deployment.

The purpose of this project was to learn how to build a clean, custom AI chatbot setup from scratch that handles real-world features: **user data privacy, model flexibility, and custom developer control**. While commercial chatbots can be closed-off and hard to customize, Athena is built to be a simple, containerized, and multi-tenant setup that lets us experiment with custom memory layers, document retrieval, and tool configurations.

### Design Goals and Architectural Choices

Athena was not designed to compete with large-scale commercial AI platforms. Instead, the project focuses on exploring architectural decisions commonly found in modern AI applications while maintaining flexibility for experimentation and learning.

| Design Area      | Typical Hosted AI Services                                                                     | Athena                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Data Storage     | User data is typically managed within vendor-controlled cloud infrastructure.                  | Documents and vector indexes are separated by user identifiers and can be stored locally or synchronized with Google Drive.    |
| Model Providers  | Usually tied to a specific model provider and deployment environment.                          | Supports interchangeable model providers through a modular LangChain-based architecture.                                       |
| Tool Integration | Tool execution is managed internally by the platform.                                          | Tool definitions, workflows, and middleware layers are directly configurable within the codebase.                              |
| Agent Control    | Internal reasoning and orchestration mechanisms are generally abstracted away from developers. | Agent workflows are implemented using LangGraph, allowing experimentation with prompts, tools, middleware, and execution flow. |
| Deployment       | Fully managed cloud services.                                                                  | Self-hosted Docker-based deployment suitable for local development and experimentation.                                        |

---

## Application Demo

[![Demo Video](https://img.shields.io/badge/Watch_Demo_Video-Click_Here-blue?style=for-the-badge&logo=youtube)](https://github.com/user-attachments/assets/cb7cbb49-3660-4212-8465-575974ce86c8)

---

## Core Features

*   **Asynchronous LangChain Agentic Reasoning**: A backend loop built on LangChain and LangGraph. It runs asynchronously to break down complex user queries, maintain execution flow, and dynamically orchestrate tool usage without blocking the server.
*   **Integrated Agent Tools**: A suite of modular tools the AI can actively select and trigger during inference, including Google Search (Google Search), Document Retrieval (retrieve_context), Web Scraping (fetch_web_page), and Gmail access (read_emails).
*   **Cognitive Middleware Pipeline**: Integrates native middlewares via `langchain.agents.middleware` to secure, stabilize, and audit agent interactions. This includes automatic model failure recovery (`ModelFallbackMiddleware`), input sanitization and credential scrubbing (`PIIMiddleware`).
*   **Deep-Think Reasoner**: A post-inference self-critique layer built by subclassing `AgentMiddleware` as the `ReEvaluateAnswerMiddleware` class with explicit configuration signatures. When enabled, it intercepts the initial generated draft to self-critique logic, verify code syntax, and refine the answer before final client delivery.
*   **Multi-Tenant RAG Pipeline (Chroma DB)**: A secure vector database system backed by Chroma DB that isolates indexes by user ID. It supports document extraction, chunking, and similarity search for standard formats (`.pdf`, `.docx`, `.md`, `.txt`) and raw source code files (`.py`, `.js`, `.ts`, `.c`, `.cpp`, `.html`, `.css`).
*   **Isolated Ingestion & Multi-File Uploads**: A drag-and-drop file upload interface supporting multi-file uploads. Users can choose to store their files either on their own Google Drive (via OAuth2 synchronization) or locally on the server machine, utilizing synchronous buffer caching to prevent handle invalidation during transfers.
*   **Specialized Agent Personalities**: Selectable system-level prompts (e.g., Coder, Researcher, Assistant, or a collaborative Human partner) that alter the agent's baseline behavior and response formatting on the fly.
*   **Persistent Conversation Memory**: Thread-safe message tracking backed by PostgreSQL and async SQLAlchemy connection pooling, ensuring contextual memory is maintained seamlessly across multiple chat turns.
*   **Multi-Provider Authentication**: Supports standard local credentials via stateless JWTs (fastapi-users) alongside Google OAuth2 integration, allowing the system to securely interact with the user's Google Workspace.
*   **Client-Side Rendering Engine**: Real-time UI rendering of complex LaTeX math formulas via KaTeX (with inline currency guards) and programming code blocks using Highlight.js, complete with copy-to-clipboard functionality.
*   **Lightweight SPA Architecture**: A classless, responsive single-page application built on vanilla ES6 modules. It features a modern fluid glassmorphism UI, absolute-positioned mobile layouts, and CSS micro-animations.
*   **Soft-Delete Architecture**: Database lifecycle management using logical cascade soft-deletes (deleted_at timestamps) at the SQLAlchemy layer to preserve data integrity and prevent accidental permanent loss of user history.

---

## Technology Stack

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

## Development Journey

Athena has evolved through key development stages to reach its final production-ready state:

*   **Athena v1.0 (The Foundation)**: Minimal single-page chat interface supporting basic conversational exchanges and active session in-memory context retention.
*   **Athena v2.0 (Identity & RAG Framework)**: Decoupled client-server architecture introducing JWT Local Auth, Google OAuth2 handshakes, document upload drawers, isolated Chroma vector search, and footnote citations.
*   **Athena v2.2 (Soft-Delete Migration)**: Auditable data persistence using logical `deleted_at` cascades across SQLAlchemy database models.
*   **Athena v3.0 (Rich Formatting)**: Rich educational rendering including KaTeX LaTeX mathematical notations, Highlight.js code editors, and Copy-to-Clipboard glass overlays.
*   **Athena v3.1 & v3.1.1 (Tables & Tools Showcase)**: Added pipe-delimited grid-table support with scroll controls, and an Agent Tools drawer displaying modular workflows.
*   **Athena v3.2 & v3.2.1 (Refinement & Standardizations)**: Transitioned UI to a lightweight glass design with dynamic wallpapers.
*   **Athena v3.3 & v3.3.1 (Code RAG & Usage Limits)**: Integrated raw code file parsing into the RAG pipeline, established database usage limits, and abstracted turn update helpers.
*   **Athena v3.4 (Lazy Thread Generation)**: Introduced lazy conversation generation where thread database allocation occurs only upon the first user prompt or upload.
*   **Athena v3.5 (Human Personality)**: Integrated the standalone local `Human` conversational personality option.
*   **Athena v3.6 (Multi-File Ingest & Watcher Fixes)**: Resolved drag-and-drop file handle invalidation with synchronous buffer caching, moved local uploads to a hidden `.uploads/` directory to prevent live-reload refreshes, and integrated `.docx` parsing requirements.
*   **Athena v3.7 (Deep-Think Config & Execution Fixes) [LATEST]**: Fixed Deep-Think middleware configuration propagation by subclassing `AgentMiddleware` with type-annotated parameters, and implemented type-safe message getters to prevent `AttributeError` during intermediate tool execution.

---

## Repository Structure

Below is the complete, high-fidelity directory tree of the finalized Athena repository:

```text
Athena/
├── .env                              # Local environmental variables & API secrets (ignored)
├── .gitignore                        # Extensive git ignore configuration
├── .uploads/                         # Hidden directory storing local document attachments and Chroma vector DB indices
├── docker-compose.yaml               # Docker deployment multi-container orchestration
├── LICENSE                           # MIT License
├── main.py                           # Entry point to launch the FastAPI server
├── migrations/                       # Alembic database migration scripts
│   ├── env.py                        # Migration environment script
│   ├── script.py.mako                # Migration template file
│   └── versions/                     # Generated database schema migration history files
├── pytest.ini                        # Pytest runner configurations
├── README.md                         # Project documentation (Athena Final Release)
├── requirements.txt                  # Python environment packages
├── src/
│   ├── backend/                      # FastAPI Asynchronous Web Engine
│   │   ├── __init__.py
│   │   ├── app.py                    # Server instantiation, global middleware hooks, and app lifespan
│   │   ├── backend.Dockerfile        # Container blueprint for backend
│   │   ├── agents/                   # Domain: Core AI Brain Mechanics
│   │   │   ├── __init__.py
│   │   │   ├── agent_personality/    # Text files defining custom system-level prompts for each agent personality
│   │   │   │   ├── assistant.txt
│   │   │   │   ├── coder.txt
│   │   │   │   ├── general.txt
│   │   │   │   ├── genz.txt
│   │   │   │   ├── human.txt
│   │   │   │   ├── researcher.txt
│   │   │   │   └── unhinged.txt
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
│       ├── frontend.Dockerfile       # Container blueprint for frontend static assets serving
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

## Getting Started

### 1. Environment Variables (`.env`)
Create a `.env` file in the project root containing your required credentials. This configuration is needed for both deployment methods:

#### Required Keys (Core System)
```ini
# Google Gemini API key and model bindings
GOOGLE_API_KEY = "your-gemini-api-key"
GOOGLE_GENERATIVE_AI_MODEL_NAME = "google_genai:gemini-3.5-flash"
GOOGLE_EMBEDDING_MODEL_NAME = "text-embedding-004"

# Core application encryption key for JWT credentials session validation
JWT_SECRET_KEY = "your-secure-jwt-secret-string"

# PostgreSQL database connection URL
# Choose the correct connection URL depending on your setup:
# For Docker Compose (Method 1):
POSTGRESQL_URL = "postgresql+asyncpg://postgres:admin@db:5432/athena_db"

# For Manual Local Setup (Method 2):
# POSTGRESQL_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/athena_db"
```

#### Optional Keys (Integrations & Diagnostics)
```ini
# Google OAuth 2.0 Credentials (Optional: required only for Google Identity flow)
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"

# Tavily Search Engine API (Optional: enables modular web search tools)
TAVILY_KEY = "your-tavily-key"

# AI Inference Fallbacks (Optional: comma-separated list of secondary models)
GOOGLE_GENEATIVE_AI_FALLBACK_MODELS = "google_genai:gemini-3.1-pro,google_genai:gemini-3.1-flash"

# LangSmith / LangChain Tracing (Optional: only needed for logging and diagnostic analytics)
LANGCHAIN_API_KEY = "your-langchain-api-key"
LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com"
```

---

### 2. Method 1: Running with Docker Compose (Recommended)
This runs the entire stack (PostgreSQL Database, FastAPI Backend, and Nginx Frontend) in containerized environments with a single command:

1. **Ensure Docker is running** on your system.
2. **Create the `.env` file** in the project root as detailed in Step 1 (making sure `POSTGRESQL_URL` uses the `db` host).
3. **Start all services**:
   ```bash
   docker-compose up --build -d
   ```
4. **Access the application**:
   - **Frontend UI Client**: `http://localhost:5500` (served via Nginx container)
   - **FastAPI API Server**: `http://localhost:8000` (served via Uvicorn backend container)
   - **PostgreSQL Database**: Port `5433` maps to database container port `5432` locally (so you can inspect it with PgAdmin or DBeaver using username `postgres` and password `admin`).

To stop and remove all container resources, networks, and configurations:
```bash
docker-compose down
```

---

### 3. Method 2: Manual Local Development Setup
If you prefer running the servers natively on your host machine for development:

#### A. Database Configuration
Before booting up the backend, ensure you have a running PostgreSQL instance:
1. Create a database named `athena_db`.
2. Configure your connection string in `.env` (using the `localhost` database connection string):
   ```ini
   POSTGRESQL_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/athena_db"
   ```

#### B. Backend Setup
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

#### C. Running the Tests
To verify all routers, agent chains, tool integrations, and ORM pipelines, execute:
```bash
pytest -v
```

#### D. Frontend Launch
Athena is built entirely on client-side modules:
*   Serve the `src/frontend/` folder using any lightweight web server. For example:
    ```bash
    python -m http.server 5500
    ```
*   Access `http://127.0.0.1:5500/src/frontend/index.html` in your web browser.

---

## API Reference

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