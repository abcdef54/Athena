import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.backend.database.models import Conversation, Message, Attachment
from src.backend.database.exceptions import ConversationNotFound
from src.backend.database import crud

pytestmark = pytest.mark.asyncio

async def test_conversation_crud_operations(db_session: AsyncSession):
    # 1. Create Conversation
    conv = await crud.create_conversation("Test Conversation Title", db_session)
    assert conv.id is not None
    assert conv.title == "Test Conversation Title"

    # 2. Get Single Conversation
    fetched_conv = await crud.get_conversation(conv.id, db_session)
    assert fetched_conv.id == conv.id
    assert fetched_conv.title == conv.title

    # 3. Get Conversations List
    conv_list = await crud.get_conversations(db_session)
    assert len(conv_list) >= 1
    assert conv_list[0].id == conv.id

    # 4. Conversation Exist
    exist_check = await crud.conversation_exist(conv.id, db_session)
    assert exist_check is not None
    assert exist_check.id == conv.id

    # 5. Rename Conversation
    renamed = await crud.rename_conversation(conv.id, "New Brand Title", db_session)
    assert renamed.title == "New Brand Title"

    # 6. Delete Conversation
    msg = await crud.create_message(
        content="Hello User",
        conversation_id=conv.id,
        role="user",
        session=db_session,
        model_name="qwen",
        temperature=0.7,
        reasoning_mode="low",
        personality="general"
    )
    
    deleted_conv = await crud.delete_conversation(conv.id, db_session)
    assert deleted_conv["id"] == conv.id

    # Check if deleted
    with pytest.raises(ConversationNotFound):
        await crud.get_conversation(conv.id, db_session)


async def test_conversation_errors(db_session: AsyncSession):
    non_existent_id = uuid.uuid4()
    
    with pytest.raises(ConversationNotFound):
        await crud.get_conversation(non_existent_id, db_session)

    with pytest.raises(ConversationNotFound):
        await crud.rename_conversation(non_existent_id, "New Name", db_session)

    with pytest.raises(ConversationNotFound):
        await crud.delete_conversation(non_existent_id, db_session)


async def test_message_crud_operations(db_session: AsyncSession):
    conv = await crud.create_conversation("Message Testing", db_session)
    
    # 1. Create Message
    msg1 = await crud.create_message(
        content="Question from user",
        conversation_id=conv.id,
        role="user",
        session=db_session,
        model_name="qwen",
        temperature=0.7,
        reasoning_mode="low",
        personality="general"
    )
    assert msg1.id is not None
    assert msg1.content == "Question from user"
    assert msg1.role == "user"

    # 2. Get Conversation Messages
    messages = await crud.get_conversation_messages(conv.id, db_session)
    assert len(messages) == 1
    assert messages[0].id == msg1.id

    # Message errors
    with pytest.raises(ConversationNotFound):
        await crud.create_message(
            content="Hi",
            conversation_id=uuid.uuid4(),
            role="user",
            session=db_session,
            model_name="qwen",
            temperature=0.7,
            reasoning_mode="low",
            personality="general"
        )

