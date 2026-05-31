import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.backend.database import crud
from src.backend.database.models import User

pytestmark = pytest.mark.asyncio

async def test_chat_routes(auth_client: AsyncClient, test_user: User, db_session: AsyncSession):
    # Setup conversation
    conv = await crud.create_conversation("Chat Route Thread", test_user, db_session)

    # 1. POST chat message
    chat_payload = {
        "conversation_id": str(conv.id),
        "content": "Hello Athena, list my files",
        "deep_think": False
    }
    
    response = await auth_client.post("/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv.id)
    assert data["role"] == "assistant"
    assert data["content"] == "Mocked Agent Response" # from mock_agent
    msg_id = data["id"]

    # Verify messages in DB
    messages = await crud.get_conversation_messages(conv.id, test_user, db_session)
    # We should have the user's message and the assistant's message
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"

    # 2. PATCH update message content
    update_payload = {
        "conversation_id": str(conv.id),
        "content": "Self-corrected response content",
        "deep_think": False
    }
    
    patch_response = await auth_client.patch(f"/chat/{msg_id}", json=update_payload)
    assert patch_response.status_code == 200
    patch_data = patch_response.json()
    assert patch_data["id"] == msg_id
    assert patch_data["content"] == "Self-corrected response content"

    # Verify updated content in DB using a fresh database session
    from tests.conftest import test_session_maker
    async with test_session_maker() as verify_session:
        messages = await crud.get_conversation_messages(conv.id, test_user, verify_session)
        assert messages[1].content == "Self-corrected response content"
