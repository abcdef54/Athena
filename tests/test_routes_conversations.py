import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.backend.database import crud
from src.backend.database.models import User

pytestmark = pytest.mark.asyncio

async def test_conversation_routes(auth_client: AsyncClient, test_user: User, db_session: AsyncSession):
    # 1. Create a conversation
    payload = {
        "user_id": str(test_user.id),
        "title": "Route Test Thread"
    }
    response = await auth_client.post("/conversation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Route Test Thread"
    assert "id" in data
    conv_id = data["id"]

    # 2. Get list of conversations
    list_response = await auth_client.get("/conversation")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data) >= 1
    assert any(c["id"] == conv_id for c in list_data)

    # 3. Get single conversation details
    detail_response = await auth_client.get(f"/conversation/{conv_id}")
    assert detail_response.status_code == 200
    detail_data = detail_response.json()
    assert detail_data["title"] == "Route Test Thread"

    # 4. Rename conversation
    rename_response = await auth_client.patch(f"/conversation/{conv_id}?new_name=Renamed%20Thread")
    assert rename_response.status_code == 200
    rename_data = rename_response.json()
    assert rename_data["title"] == "Renamed Thread"

    # 5. Fetch messages (should be empty initially)
    msg_response = await auth_client.get(f"/conversation/{conv_id}/messages")
    assert msg_response.status_code == 200
    assert msg_response.json() == []

    # 6. Fetch sources for a non-existent message
    sources_response = await auth_client.get(f"/conversation/{conv_id}/messages/{uuid.uuid4()}/sources")
    assert sources_response.status_code == 404

    # 7. Delete conversation
    delete_response = await auth_client.delete(f"/conversation/{conv_id}")
    assert delete_response.status_code == 200
    delete_data = delete_response.json()
    assert delete_data["id"] == conv_id

    # Verify deleted
    check_response = await auth_client.get(f"/conversation/{conv_id}")
    assert check_response.status_code == 500 # get_conversation raises ConversationNotFound which returns 500 error in route handler


async def test_conversation_routes_unauthorized(client: AsyncClient):
    response = await client.get("/conversation")
    assert response.status_code == 401
