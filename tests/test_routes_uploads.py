import pytest
import io
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.backend.database import crud
from src.backend.database.models import User, StorageProvider

pytestmark = pytest.mark.asyncio

async def test_uploads_routes(auth_client: AsyncClient, test_user: User, db_session: AsyncSession):
    # Setup conversation
    conv = await crud.create_conversation("Uploads Route Thread", test_user, db_session)

    # 1. POST file upload
    file_content = b"Simple text file contents"
    files = {"file": ("route_doc.txt", file_content, "text/plain")}
    
    # Mock ingest and local file write
    with patch("src.backend.database.crud.ingest_docs", AsyncMock()), \
         patch("shutil.copyfileobj", lambda f, t: t.write(f.read())):
        
        response = await auth_client.post(
            f"/uploads?conversation_id={conv.id}&provider=local",
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == "route_doc.txt"
        assert data["storage_provider"] == "local"
        file_id = data["id"]

    # 2. GET global user uploads
    get_response = await auth_client.get("/uploads")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert len(get_data) >= 1
    assert any(a["id"] == file_id for a in get_data)

    # 3. GET conversation-specific uploads
    conv_response = await auth_client.get(f"/uploads/conversation/{conv.id}")
    assert conv_response.status_code == 200
    conv_data = conv_response.json()
    assert len(conv_data) == 1
    assert conv_data[0]["id"] == file_id

    # 4. DELETE uploaded file
    with patch("os.path.exists", return_value=True), \
         patch("os.remove", return_value=None):
        
        del_response = await auth_client.delete(
            f"/uploads/conversation/{conv.id}/{file_id}?provider=local"
        )
        assert del_response.status_code == 200
        del_data = del_response.json()
        assert del_data["id"] == file_id
