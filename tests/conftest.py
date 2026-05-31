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
os.environ["ATHENA_SYSTEM_INSTRUCTION"] = "You are Athena."
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


# ----------------- 2. MONKEYPATCH ENGINE & AGENTS CONFIG BEFORE ANY BACKEND IMPORTS -----------------
import src.backend.database.session as db_session
db_session.async_session_maker = test_session_maker
db_session.engine = test_engine
db_session.get_async_session = override_get_async_session

import src.backend.agents.config as agents_config
agents_config.document_embedding_model = mock_embeddings
agents_config.query_embedding_model = mock_embeddings
agents_config.llm = mock_llm
agents_config._get_user_vector_store = mock_get_user_vector_store


# ----------------- 3. MONKEYPATCH CORE MODULES -----------------
import src.backend.agents.core as agents_core
agents_core.create_agent = MagicMock(return_value=mock_agent)
agents_core.make_agent = MagicMock(return_value=mock_agent)

import src.backend.agents as agents_pkg
agents_pkg.make_agent = MagicMock(return_value=mock_agent)

import src.backend.agents.tools as tools_mod
tools_mod.query_embedding_model = mock_embeddings
tools_mod._get_user_vector_store = mock_get_user_vector_store


# ----------------- 4. MONKEYPATCH GOOGLE APIS & IMPORTS -----------------
import src.backend.auth.core as auth_core
from google.oauth2.credentials import Credentials

async def mock_get_google_credentials(user_id, session):
    return MagicMock(spec=Credentials)

auth_core.get_google_credentials = mock_get_google_credentials

# Also mock googleapiclient.discovery.build on crud & tools modules
import src.backend.database.crud as crud_mod

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
from src.backend.database.models import Base, User, UserOAuthToken

# Override make_agent in routes.chat
import src.backend.routes.chat as chat_route
chat_route.agent = mock_agent

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

@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Creates and returns a verified test user with Google OAuth credentials seeded."""
    from sqlalchemy import select
    stmt = select(User).where(User.email == "test@example.com")
    result = await db_session.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        return existing_user

    import uuid
    from fastapi_users.password import PasswordHelper
    
    password_helper = PasswordHelper()
    hashed_password = password_helper.hash("test-password-123")
    
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password=hashed_password,
        is_active=True,
        is_verified=True,
        is_superuser=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = UserOAuthToken(
        id=uuid.uuid4(),
        user_id=user.id,
        oauth_name="google",
        account_id="google-id-123",
        account_email="test@example.com",
        access_token="mock-access-token",
        refresh_token="mock-refresh-token",
        expires_at=9999999999,
        scopes="openid,email,profile,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/gmail.readonly"
    )
    db_session.add(token)
    await db_session.commit()
    
    return user

@pytest.fixture
async def auth_client(client: AsyncClient, test_user: User) -> AsyncClient:
    """Provides an authenticated AsyncClient with JWT Bearer header set."""
    from src.backend.auth.core import get_jwt_strategy
    jwt_strategy = get_jwt_strategy()
    token = await jwt_strategy.write_token(test_user)
    
    client.headers["Authorization"] = f"Bearer {token}"
    return client
