import os
import sys
import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock
from httpx import AsyncClient

# Add the project root to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set environment variables for testing before imports
os.environ["POSTGRESQL_URL"] = "sqlite+aiosqlite:///.test_temp_db.sqlite"
os.environ["GOOGLE_CLIENT_ID"] = "mock-client-id"
os.environ["GOOGLE_CLIENT_SECRET"] = "mock-client-secret"
os.environ["JWT_SECRET_KEY"] = "mock-secret-key-1234567890-abcdefghij"
os.environ["GOOGLE_API_KEY"] = "mock-google-api-key"
os.environ["GOOGLE_EMBEDDING_MODEL_NAME"] = "models/text-embedding-004"
os.environ["GOOGLE_GENERATIVE_AI_MODEL_NAME"] = "gemini-1.5-flash"
os.environ["GOOGLE_GENEATIVE_AI_FALLBACK_MODELS"] = "gemini-1.5-pro"
os.environ["LOCALMIND_SYSTEM_INSTRUCTION"] = "You are LocalMind."
os.environ["LANGCHAIN_ENDPOINT"] = "http://localhost:8000"
os.environ["LANGCHAIN_API_KEY"] = "mock-lc-key"

# ----------------- 1. INITIALIZE ALL GLOBAL MOCKS -----------------
# Mock langchain middleware class constructor before import
import langchain.agents.middleware
class MockMiddleware:
    wrap_tool_call = MagicMock()
    name = "MockMiddleware"

langchain.agents.middleware.ModelFallbackMiddleware = MagicMock(return_value=MockMiddleware())
langchain.agents.middleware.PIIMiddleware = MagicMock(return_value=MockMiddleware())
langchain.agents.middleware.HumanInTheLoopMiddleware = MagicMock(return_value=MockMiddleware())

# Mock standard langchain agents factory create_agent
mock_agent = MagicMock()
mock_agent.ainvoke = AsyncMock(return_value={"output": "Mocked Agent Response", "intermediate_steps": []})

import langchain.agents
import langchain.agents.factory
langchain.agents.create_agent = MagicMock(return_value=mock_agent)
langchain.agents.factory.create_agent = MagicMock(return_value=mock_agent)

# Mock embeddings & LLMs
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

mock_embeddings = MagicMock(spec=GoogleGenerativeAIEmbeddings)
mock_embeddings.embed_query = MagicMock(return_value=[0.1] * 3072)
mock_embeddings.embed_documents = MagicMock(return_value=[[0.1] * 3072])

mock_llm = MagicMock(spec=ChatGoogleGenerativeAI)
mock_ai_message = MagicMock()
mock_ai_message.content = "Mocked AI Response"
mock_ai_message.type = "ai"
mock_llm.ainvoke = AsyncMock(return_value=mock_ai_message)

# Mock Chroma vector store
mock_vector_store = MagicMock(spec=Chroma)
mock_vector_store.similarity_search_by_vector = MagicMock(return_value=[])
mock_vector_store.add_documents = MagicMock(return_value=[])
mock_vector_store.delete = MagicMock()

def mock_get_user_vector_store(user_id: str):
    return mock_vector_store

# Override session engine for testing using a temporary file-based SQLite database
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
test_engine = create_async_engine("sqlite+aiosqlite:///.test_temp_db.sqlite", echo=False)
test_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)

# Also override get_async_session dependency function
async def override_get_async_session() -> AsyncSession:
    async with test_session_maker() as session:
        yield session


# ----------------- 2. MONKEYPATCH ENGINE & AI INTEGRATION BEFORE ANY BACKEND IMPORTS -----------------
import src.backend.database.session as db_session
db_session.async_session_maker = test_session_maker
db_session.engine = test_engine
db_session.get_async_session = override_get_async_session

# Mock LocalMindAI
from src.backend.ai.langgraph.graph_builder import LocalMindAI
LocalMindAI.chat = AsyncMock(return_value={
    'final_answer': 'Mocked Agent Response',
    'citations': []
})
LocalMindAI.baseline_chat = AsyncMock(return_value='Mocked Agent Response')

# Mock LocalMindVectorDB
import src.backend.ai.langchain.vector_db as vector_db_mod

class MockLocalMindVectorDB:
    def __init__(self, *args, **kwargs):
        self._vector_store = mock_vector_store
        self._embeddings = mock_embeddings

    async def ingest(self, file_path, attachment_id, chunk_size=500, chunk_overlap=50):
        mock_vector_store.add_documents([MagicMock()])

    async def query(self, text, n_results=4, file_id_filter=None):
        return []

    async def delete_file(self, attachment_id):
        pass

vector_db_mod.LocalMindVectorDB = MockLocalMindVectorDB


# ----------------- 4. MONKEYPATCH GOOGLE APIS & IMPORTS -----------------
from google.oauth2.credentials import Credentials

async def mock_get_google_credentials(user_id, session):
    return MagicMock(spec=Credentials)


# Also mock googleapiclient.discovery.build on crud & tools modules
import src.backend.database.crud as crud_mod
import src.backend.ai.langchain.tools as tools_mod

mock_build_service = MagicMock()
mock_drive_files = MagicMock()
mock_drive_files.create = MagicMock(return_value=MagicMock(execute=MagicMock(return_value={"id": "mock-drive-id"})))
mock_drive_files.delete = MagicMock(return_value=MagicMock(execute=MagicMock(return_value={})))
mock_build_service.files = MagicMock(return_value=mock_drive_files)

mock_gmail_users = MagicMock()
mock_gmail_messages = MagicMock()
mock_gmail_messages.list = MagicMock(return_value=MagicMock(execute=MagicMock(return_value={"messages": [{"id": "msg-id"}]})))
mock_gmail_messages.get = MagicMock(return_value=MagicMock(execute=MagicMock(return_value={
    "id": "msg-id",
    "snippet": "mock email body",
    "payload": {
        "headers": [
            {"name": "Subject", "value": "Test Subject"},
            {"name": "From", "value": "sender@test.com"}
        ]
    }
})))
mock_gmail_users.messages = MagicMock(return_value=mock_gmail_messages)
mock_build_service.users = MagicMock(return_value=mock_gmail_users)

def mock_build(service_name, version, credentials=None):
    return mock_build_service

crud_mod.build = mock_build
tools_mod.build = mock_build


# ----------------- 5. LOAD FASTAPI APP & DEFINE FIXTURES -----------------
from src.backend.app import app
from src.backend.database.session import get_async_session
from src.backend.database.models import Base


@pytest.fixture(scope="function", autouse=True)
async def setup_database():
    """Initializes the database schema once for each test to ensure total isolation."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await test_engine.dispose()
    if os.path.exists(".test_temp_db.sqlite"):
        try:
            os.remove(".test_temp_db.sqlite")
        except Exception:
            pass

@pytest.fixture
async def db_session() -> AsyncSession:
    """Provides a transactional db session for test seeding."""
    async with test_session_maker() as session:
        yield session

@pytest.fixture
async def client() -> AsyncClient:
    """Provides an unauthenticated AsyncClient for hitting FastAPI endpoints."""
    app.dependency_overrides[get_async_session] = override_get_async_session
    
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

