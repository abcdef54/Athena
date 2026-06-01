# ✧ Athena — Premium Liquid Glass Conversational AI Platform (v3.2.1)

Athena is a premium, state-of-the-art conversational intelligence platform. Re-engineered into a weightless **Liquid Glass** aesthetic, Athena represents a mature, final, and highly optimized SPA environment. The platform integrates an asynchronous **FastAPI** backend driven by LangChain and LangGraph cognitive workflows, a highly secure multi-tenant session manager, and an isolated **Chroma Vector DB** retrieval-augmented generation (RAG) indexing pipeline.

The frontend is built purely as a high-performance, modular ES6 single-page application utilizing Vanilla CSS3 and HTML5. It wows users at first glance with an organically alive dynamic wallpaper engine, refractive glassmorphism panels, floating Dynamic Island controls, and standard-setting markdown rendering (featuring KaTeX LaTeX formulas, Highlight.js code editors, and interactive grids).

> [!IMPORTANT]
> This is the **final, production-grade release** of the Athena platform. All core development objectives—including custom agentic tool suites, robust multi-provider OAuth, rich media math rendering, responsive layouts, and soft-delete migrations—have been successfully completed and validated under a 100% passing automated unit test framework. The project is considered feature-complete with no future updates planned.

---

## 🌟 Core Features

### 🎨 1. Premium Liquid Glass Aesthetic & Motion
*   **Weightless Glassmorphism**: Overhauled visual components using transparent glass shielding (`rgba(15, 22, 36, 0.65)` to `0.85`) combined with deep, hardware-accelerated blur (`blur(50px)` to `blur(80px) saturate(200%)`).
*   **Organically Alive Canvas**: Includes a floating **Dynamic Wallpaper Engine** allowing users to cycle through 5 high-contrast local landscapes and architectural backdrops. Visual panels beautifully warp and refract the underlying wallpaper colors.
*   **Rim Lighting Highlights**: Simulates real-world glass panes using high-fidelity inset highlights (`box-shadow: inset 0 1px 0 0 var(--glass-edge-highlight)`) and subtle drop shadows.
*   **Micro-Glass Interactions**: Replaced legacy solid selections with premium `rgba(255, 255, 255, 0.1)` micro-glass hovers.

### 🧩 2. Floating Controls & Dynamic Island
*   **Dynamic Island Chat Title**: Replaced traditional horizontal top headers with a compact, floating center-anchored glass pill, preserving clean, spacious viewport canvases.
*   **Mobile-First floating menu**: Relocated responsive mobile toggle controls into absolute-positioned glass pills.
*   **Discoverable Agent Tools popup**: Features an animated, dark-tinted popup menu triggered by a `+` button in the chat input bar, showcasing available modular tools (Google Search, context retrievers, Gmail inbox readers).
*   **Custom Personality Dropdown**: Completely replaced legacy native selects with a custom, premium glass dropdown supporting custom personas (General, Coder, Researcher, Assistant, Gen-Z, Unhinged). Employs property interceptors to synchronize values and disable controls programmatically during network inference turns.

### 🧠 3. Asynchronous Cognitive RAG Backend
*   **LangChain & LangGraph Agents**: Sequential multi-step reasoning capabilities routing observations from web search tools, email readers, and context vectors.
*   **Candidate Oversampling & Deduplication**: Prevents RAG context crowding by oversampling similarity candidates and purging duplicate text hashes before feeding sources to the LLM.
*   **Intelligent Footnote Citations**: click-active citation pills pop up in chat panels to display metadata summaries (source, type, file size, ingestion time) without breaking reader flow.
*   **Document Ingestion Drawer**: Drag-and-drop drawers supporting `.pdf`, `.docx`, `.md`, and `.txt` ingestion, default-routing documents to **Google Drive** storage with seamless **Local Storage** fallbacks.

### 📝 4. Rich Document & Math Rendering
*   **KaTeX LaTeX Math Rendering**: Synchronously processes inline math (`$...$`) and display formulas (`$$...$$`) with built-in currency false-positive guards.
*   **Highlight.js Code Blocks**: Atom One Dark re-themed code panels displaying syntax highlighting for dozens of programming languages, with a responsive "Copy to Clipboard"emerald-glow button.
*   **Modern Responsive Tables**: Formats Markdown grids inside `.table-wrapper` scroll bars featuring gradient headers, alternating row highlights, and micro-animations.

---

## 📈 Version History & Development Roadmap

Athena has undergone a comprehensive, multi-phase evolution, transforming from a simple terminal-like chatbot into a premium, feature-rich glassmorphic web application:

### 🏛️ Athena v1.0 (The Foundation)
*   **Description**: The initial core chatbot interface built to establish basic message exchanges.
    *   *Features*:
        *   Simple conversational chat input and API-answering framework.
        *   In-memory context retention allowing simple follow-up questions within active sessions.
        *   Standard static dark theme layout with basic bubble cards.

### 🔐 Athena v2.0 (Identity & RAG Framework)
*   **Description**: Re-engineered the application into a decoupled client-server architecture with secure user workspaces and database memory.
    *   *Features*:
        *   Divided frontend into a modular ES6 Single Page App.
        *   Implemented standard JWT Local Credentials Auth and Google OAuth2 redirected offline-access handshakes.
        *   Introduced the drag-and-drop document upload drawer.
        *   Isolated Chroma DB vector similarity retrieval channels.
        *   Added real-time message citation footnote lists.

### 🗑️ Athena v2.2 (Soft-Delete Migration)
*   **Description**: Transitioned conversational data storage to a safe, auditable soft-delete architecture.
    *   *Features*:
        *   Added default-null logical deletion timestamps (`deleted_at`) to database models.
        *   Enforced logical constraints across active CRUD queries.
        *   Implemented hard-delete vector purging exceptions for storage file cleanups.

### 🎙️ Athena v3.0 (Rich Formatting & Math rendering)
*   **Description**: Refactored frontend markdown parsers to support rich educational, mathematical, and programming notations.
    *   *Features*:
        *   Integrated KaTeX CDN libraries for high-performance inline and block LaTeX rendering.
        *   Integrated Highlight.js with Atom One Dark theme syntax styling.
        *   Built interactive Copy-to-Clipboard hooks into glass panels.

### 📊 Athena v3.1 (Responsive Grid Tables)
*   **Description**: Added support for structural data rendering inside chat flows.
    *   *Features*:
        *   Added pipe-delimited grid-table regex parser algorithms.
        *   Wrapped grids in scrollable `.table-wrapper` containers.
        *   Styled tables with gradient headers, alternating row tints, and row highlights.

### ➕ Athena v3.1.1 (Agent Tools Showcase)
*   **Description**: Expanded discoverability of the modular backend capabilities inside the input bar.
    *   *Features*:
        *   Added a floating `+` button inside the chat text box.
        *   Created an animated `.tools-popup` displaying available agent functions.

### 💎 Athena v3.2 & v3.2.1 (Liquid Glass Overhaul)
*   **Description**: The final visual and functional polish that standardizes all components under a weightless glass design system.
    *   *Features*:
        *   Replaced opaque dark elements with transparent glass shielding (`blur(50px)` to `blur(80px)` saturate `200%`).
        *   Built the Dynamic Wallpaper Engine with 5 local dynamic landscape backdrops.
        *   Created center-anchored Dynamic Island titles and floating mobile menu pills.
        *   Expanded message panel bottom scroll clearance to `180px` to resolve input box collisions.
        *   Upgraded the Agent Tools panel to a high-density readability shield (`rgba(15, 22, 36, 0.65)`).
        *   Overhauled the Personality selector into a premium custom glass dropdown with native `.disabled` property interceptors.
        *   Standardized all interactive elements, loader spinners, checkboxes, and link highlights on a premium, vivid Apple blue accent (`#00a2ff`).

---

## 🛠️ Technology Stack

Athena is built using a clean, modern, and highly modular technology stack designed for optimal concurrency and extensibility:

### Frontend
- **HTML5 (Semantic UI)**: Semantic elements for structural layout, accessibility, and high-fidelity indexing.
- **CSS3 (Vanilla CSS)**: Curated Liquid Glass parameters, fluid grid layouts, and active micro-animations.
- **ES6 JavaScript Modules**: Organized as a classless client architecture separating routing ([api.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/api.js)), RAG documents ([attachments.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/attachments.js)), chat states ([chat.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/chat.js)), auth lifecycles ([auth.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/auth.js)), thread logic ([conversations.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/conversations.js)), and DOM/popovers ([ui.js](file:///d:/Work/Code/GithubProjects/LocalMind/src/frontend/js/ui.js)).

### Backend
- **FastAPI**: Asynchronous web framework.
- **SQLAlchemy (Async)**: Concurrency-driven database connection pool engine utilizing `asyncpg`.
- **Alembic**: Database schema migrations control.
- **LangChain / LangGraph**: Advanced AI cognitive workflows, tool mappings, and pregel middleware chains.
- **Chroma DB**: Isolated localized document vector store indexes.

### Database
- **PostgreSQL**: Production-grade transactional repository for users, logical session threads, chat attachments, and secure OAuth tokens.

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
Create a `.env` file in the project root with the following configuration layout:
```ini
# LLM Endpoint & Provider Options
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"
GOOGLE_API_KEY = "your-gemini-api-key"
GOOGLE_GENERATIVE_AI_MODEL_NAME = "gemini-3.5-flash"
GOOGLE_EMBEDDING_MODEL_NAME = "text-embedding-004"

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
| **Threads** | `/conversation` | `GET` | Fetches all active conversation threads sorted descending (excludes soft-deletes). |
| **Threads** | `/conversation/{id}/messages` | `GET` | Retrieves full message transcript timeline for a thread (excludes soft-deletes). |
| **Uploads** | `/uploads/conversation/{id}` | `POST` | Upload and securely ingest a text, docx, or pdf document. |
| **Uploads** | `/uploads/conversation/{id}` | `GET` | Lists all active document attachments linked to a thread. |
| **Uploads** | `/uploads/{attachment_id}` | `DELETE` | Removes file record, cleans local/Google Drive files, and purges Chroma vector indices. |