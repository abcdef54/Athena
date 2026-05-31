import pytest
import uuid
import os
import shutil
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.backend.database.models import User, Conversation, Message, Attachment, StorageProvider
from src.backend.database.exceptions import ConversationNotFound, MessageNotFound
from src.backend.database import crud

pytestmark = pytest.mark.asyncio

async def test_conversation_crud_operations(db_session: AsyncSession, test_user: User):
    # 1. Create Conversation
    conv = await crud.create_conversation("Test Conversation Title", test_user, db_session)
    assert conv.id is not None
    assert conv.title == "Test Conversation Title"
    assert conv.user_id == test_user.id

    # 2. Get Single Conversation
    fetched_conv = await crud.get_conversation(conv.id, test_user, db_session)
    assert fetched_conv.id == conv.id
    assert fetched_conv.title == conv.title

    # 3. Get Conversations List
    conv_list = await crud.get_conversations(test_user, db_session)
    assert len(conv_list) >= 1
    assert conv_list[0].id == conv.id

    # 4. Conversation Exist
    exist_check = await crud.conversation_exist(conv.id, db_session)
    assert exist_check is not None
    assert exist_check.id == conv.id

    # 5. Rename Conversation
    renamed = await crud.rename_conversation(conv.id, "New Brand Title", test_user, db_session)
    assert renamed.title == "New Brand Title"

    # 6. Delete Conversation
    # Let's seed a message & attachment first to ensure cascading delete works
    msg = await crud.create_message("Hello User", conv.id, "user", db_session)
    
    # Mock ingest docs and user vector store for delete cascade
    with patch("src.backend.database.crud.ingest_docs", AsyncMock()), \
         patch("src.backend.database.crud.remove_attachment", AsyncMock(return_value={})):
        
        deleted_conv = await crud.delete_conversation(conv.id, test_user, db_session)
        assert deleted_conv["id"] == conv.id

    # Check if deleted
    with pytest.raises(ConversationNotFound):
        await crud.get_conversation(conv.id, test_user, db_session)


async def test_conversation_errors(db_session: AsyncSession, test_user: User):
    non_existent_id = uuid.uuid4()
    
    with pytest.raises(ConversationNotFound):
        await crud.get_conversation(non_existent_id, test_user, db_session)

    with pytest.raises(ConversationNotFound):
        await crud.rename_conversation(non_existent_id, "New Name", test_user, db_session)

    with pytest.raises(ConversationNotFound):
        await crud.delete_conversation(non_existent_id, test_user, db_session)

    # Permission check: Create another user
    other_user = User(
        id=uuid.uuid4(),
        email="other@example.com",
        hashed_password="hashed-pwd",
        is_active=True,
        is_verified=True
    )
    db_session.add(other_user)
    await db_session.commit()

    conv = await crud.create_conversation("Other User Conv", other_user, db_session)
    
    with pytest.raises(PermissionError):
        await crud.get_conversation(conv.id, test_user, db_session)

    with pytest.raises(PermissionError):
        await crud.rename_conversation(conv.id, "Hack Title", test_user, db_session)

    with pytest.raises(PermissionError):
        await crud.delete_conversation(conv.id, test_user, db_session)


async def test_message_crud_operations(db_session: AsyncSession, test_user: User):
    conv = await crud.create_conversation("Message Testing", test_user, db_session)
    
    # 1. Create Message
    msg1 = await crud.create_message("Question from user", conv.id, "user", db_session)
    assert msg1.id is not None
    assert msg1.content == "Question from user"
    assert msg1.role == "user"

    # 2. Get Conversation Messages
    messages = await crud.get_conversation_messages(conv.id, test_user, db_session)
    assert len(messages) == 1
    assert messages[0].id == msg1.id

    # 3. Update Message
    updated_msg = await crud.update_message(msg1.id, conv.id, "Updated content", test_user, db_session)
    assert updated_msg.content == "Updated content"

    # Message errors
    with pytest.raises(ConversationNotFound):
        await crud.create_message("Hi", uuid.uuid4(), "user", db_session)

    with pytest.raises(MessageNotFound):
        await crud.update_message(uuid.uuid4(), conv.id, "Updated", test_user, db_session)


async def test_attachment_crud_operations(db_session: AsyncSession, test_user: User):
    conv = await crud.create_conversation("Attachment Testing", test_user, db_session)
    
    # Prepare Mock UploadFile
    mock_file_content = b"This is a dummy text document contents to split and ingest."
    
    # Standard bytes upload file wrapper
    import io
    file_io = io.BytesIO(mock_file_content)
    upload_file = UploadFile(filename="test_doc.txt", file=file_io, headers={"content-type": "text/plain"})

    # 1. Create Attachment (Local Provider)
    with patch("src.backend.database.crud.ingest_docs", AsyncMock()) as mock_ingest, \
         patch("shutil.copyfileobj", lambda f, t: t.write(f.read())):
        
        attachment = await crud.create_attachment(
            conversation_id=conv.id,
            file=upload_file,
            storage_provider=StorageProvider.LOCAL,
            user=test_user,
            session=db_session
        )
        
        assert attachment.id is not None
        assert attachment.file_name == "test_doc.txt"
        assert attachment.storage_provider == StorageProvider.LOCAL
        mock_ingest.assert_called_once()

    # 2. Get Global User Attachments
    attachments = await crud.get_attachments(test_user, db_session)
    assert len(attachments) >= 1
    assert attachments[0].id == attachment.id

    # 3. Get Thread-Specific Attachments
    conv_attachments = await crud.get_conversation_attachments(conv.id, test_user, db_session)
    assert len(conv_attachments) == 1
    assert conv_attachments[0].id == attachment.id

    # 4. Remove Attachment
    # Mock delete disk file & uningest vector DB
    with patch("os.path.exists", return_value=True), \
         patch("os.remove", return_value=None):
        
        deleted_data = await crud.remove_attachment(
            conversation_id=conv.id,
            file_id=attachment.id,
            storage_provider=StorageProvider.LOCAL,
            user=test_user,
            session=db_session
        )
        assert deleted_data["id"] == attachment.id
        assert deleted_data["file_name"] == "test_doc.txt"


async def test_attachment_google_drive(db_session: AsyncSession, test_user: User):
    conv = await crud.create_conversation("GDrive Attachment Testing", test_user, db_session)
    
    import io
    file_io = io.BytesIO(b"Google Drive Contents")
    upload_file = UploadFile(filename="gdrive_doc.pdf", file=file_io, headers={"content-type": "application/pdf"})

    # Create Attachment via Google Drive Provider
    with patch("src.backend.database.crud.ingest_docs", AsyncMock()), \
         patch("src.backend.database.crud.get_google_credentials", AsyncMock()):
        
        attachment = await crud.create_attachment(
            conversation_id=conv.id,
            file=upload_file,
            storage_provider=StorageProvider.GOOGLE_DRIVE,
            user=test_user,
            session=db_session
        )
        assert attachment.id is not None
        assert attachment.storage_provider == StorageProvider.GOOGLE_DRIVE
        assert attachment.file_path == "mock-drive-id" # from conftest mock build

    # Remove Attachment GDrive
    with patch("src.backend.database.crud.get_google_credentials", AsyncMock()):
        deleted_data = await crud.remove_attachment(
            conversation_id=conv.id,
            file_id=attachment.id,
            storage_provider=StorageProvider.GOOGLE_DRIVE,
            user=test_user,
            session=db_session
        )
        assert deleted_data["id"] == attachment.id


async def test_soft_delete_conversation(db_session: AsyncSession, test_user: User):
    # 1. Create a conversation and add a message
    conv = await crud.create_conversation("Soft Delete Conv", test_user, db_session)
    msg = await crud.create_message("Hello Athena Soft Delete", conv.id, "user", db_session, user=test_user)

    # 2. Call delete_conversation to trigger soft delete
    with patch("src.backend.database.crud.ingest_docs", AsyncMock()), \
         patch("src.backend.database.crud.remove_attachment", AsyncMock(return_value={})):
        
        deleted_data = await crud.delete_conversation(conv.id, test_user, db_session)
        assert deleted_data["id"] == conv.id
        assert deleted_data["title"] == "Soft Delete Conv"

    # 3. Check that the conversation is no longer returned by get_conversations
    active_conversations = await crud.get_conversations(test_user, db_session)
    assert not any(c.id == conv.id for c in active_conversations)

    # 4. Check that get_conversation raises ConversationNotFound
    with pytest.raises(ConversationNotFound):
        await crud.get_conversation(conv.id, test_user, db_session)

    # 5. Verify the columns directly in the database using a raw SQLAlchemy select (bypassing crud soft-delete filters)
    stmt_conv = select(Conversation).where(Conversation.id == conv.id)
    res_conv = await db_session.execute(stmt_conv)
    db_conv = res_conv.scalar_one_or_none()
    assert db_conv is not None
    assert db_conv.deleted_at is not None  # It exists but deleted_at is populated!

    stmt_msg = select(Message).where(Message.id == msg.id)
    res_msg = await db_session.execute(stmt_msg)
    db_msg = res_msg.scalar_one_or_none()
    assert db_msg is not None
    assert db_msg.deleted_at is not None  # Cascaded message deleted_at is populated!
