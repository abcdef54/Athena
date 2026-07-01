import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.backend.database import crud

pytestmark = pytest.mark.asyncio

async def test_chat_routes(client: AsyncClient, db_session: AsyncSession):
    # Setup conversation
    conv = await crud.create_conversation("Chat Route Thread", db_session)

    # 1. POST chat message
    chat_payload = {
        "conversation_id": str(conv.id),
        "content": "Hello LocalMind, list my files",
        "model_name": "qwen"
    }
    
    response = await client.post("/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv.id)
    assert data["role"] == "assistant"
    assert data["content"] == "Mocked Agent Response"
    msg_id = data["id"]

    # Verify messages in DB
    messages = await crud.get_conversation_messages(conv.id, db_session)
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"


async def test_chat_personality(client: AsyncClient, db_session: AsyncSession):
    # Setup conversation
    conv = await crud.create_conversation("Chat Personality Thread", db_session)

    # 1. POST chat message with a specific personality
    chat_payload = {
        "conversation_id": str(conv.id),
        "content": "Hello LocalMind Code Architect",
        "personality": "code",
        "model_name": "qwen"
    }
    
    response = await client.post("/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv.id)
    assert data["personality"] == "code"
    assert data["content"] == "Mocked Agent Response"

    # Verify message records in DB using a fresh database session
    from tests.conftest import test_session_maker
    async with test_session_maker() as verify_session:
        messages = await crud.get_conversation_messages(conv.id, verify_session)
        assert len(messages) == 2
        # User message personality is None
        assert messages[0].role == "user"
        assert messages[0].personality is None
        
        # Assistant message personality should match the requested personality
        assert messages[1].role == "assistant"
        assert messages[1].personality == "code"


async def test_chat_tools_disabled(client: AsyncClient, db_session: AsyncSession):
    # Setup conversation
    conv = await crud.create_conversation("Chat Tools Disabled Thread", db_session)

    # POST chat message with tools disabled
    chat_payload = {
        "conversation_id": str(conv.id),
        "content": "List my files",
        "model_name": "qwen",
        "tools_enabled": False
    }
    
    response = await client.post("/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv.id)
    assert data["content"] == "Mocked Agent Response"




