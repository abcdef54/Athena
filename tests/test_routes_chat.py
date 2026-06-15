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
        "content": "Hello LocalMind, list my files",
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


async def test_chat_personality(auth_client: AsyncClient, test_user: User, db_session: AsyncSession):
    # Setup conversation
    conv = await crud.create_conversation("Chat Personality Thread", test_user, db_session)

    # 1. POST chat message with a specific personality
    chat_payload = {
        "conversation_id": str(conv.id),
        "content": "Hello LocalMind Code Architect",
        "personality": "coder",
        "deep_think": False
    }
    
    response = await auth_client.post("/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conversation_id"] == str(conv.id)
    assert data["personality"] == "coder"
    assert data["content"] == "Mocked Agent Response"

    # Verify message records in DB using a fresh database session
    from tests.conftest import test_session_maker
    async with test_session_maker() as verify_session:
        messages = await crud.get_conversation_messages(conv.id, test_user, verify_session)
        assert len(messages) == 2
        # User message personality is None
        assert messages[0].role == "user"
        assert messages[0].personality is None
        
        # Assistant message personality should match the requested personality
        assert messages[1].role == "assistant"
        assert messages[1].personality == "coder"


async def test_chat_free_limit(auth_client: AsyncClient, test_user: User):
    from tests.conftest import test_session_maker
    from src.backend.database.models import User
    from sqlalchemy import select

    # 1. Update user to start at 0 preview_turn_useds
    async with test_session_maker() as session:
        res = await session.execute(select(User).where(User.id == test_user.id))
        db_user = res.scalar_one()
        db_user.preview_turn_useds = 0
        db_user.max_preview_turn = 3
        await session.commit()

    # Create conversation
    async with test_session_maker() as session:
        res = await session.execute(select(User).where(User.id == test_user.id))
        db_user = res.scalar_one()
        conv = await crud.create_conversation("Free Limit Thread", db_user, session)

    chat_payload = {
        "conversation_id": str(conv.id),
        "content": "Hello",
        "deep_think": False
    }

    # First chat should succeed and increment turn
    response = await auth_client.post("/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    msg_id = data["id"]
    
    # Reload user and check preview_turn_useds is 1
    async with test_session_maker() as session:
        res = await session.execute(select(User).where(User.id == test_user.id))
        db_user = res.scalar_one()
        assert db_user.preview_turn_useds == 1

    # 2. Exceed the free limit
    async with test_session_maker() as session:
        res = await session.execute(select(User).where(User.id == test_user.id))
        db_user = res.scalar_one()
        db_user.preview_turn_useds = 3
        await session.commit()

    # 3. Post a message, should fail with 402
    response = await auth_client.post("/chat", json=chat_payload)
    assert response.status_code == 402
    data = response.json()
    assert "You have reached the free limit" in data["detail"]
    assert "https://github.com/abcdef54/LocalMind" in data["detail"]

    # 4. Patch a message, should also fail with 402
    update_payload = {
        "conversation_id": str(conv.id),
        "content": "Updated content",
        "deep_think": False
    }
    patch_response = await auth_client.patch(f"/chat/{msg_id}", json=update_payload)
    assert patch_response.status_code == 402
    patch_data = patch_response.json()
    assert "You have reached the free limit" in patch_data["detail"]


