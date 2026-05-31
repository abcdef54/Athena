import os
import shutil
import uuid
import asyncio
import tempfile

from typing import Optional, List, Dict
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from src.backend.database.models import Conversation, Message, Attachment, StorageProvider, User
from src.backend.database.exceptions import ConversationNotFound, MessageNotFound
from src.backend.auth import get_google_credentials
from src.backend.agents.config import _get_user_vector_store, ingest_docs


def coerce_uuid(val):
    if isinstance(val, str):
        return uuid.UUID(val)
    return val



async def create_conversation(
    title: str,
    user: User,
    session: AsyncSession
) -> Conversation:
    try:
        new_conversation = Conversation(
            title=title,
            user_id=user.id
        )

        session.add(new_conversation)
        await session.commit()
        await session.refresh(new_conversation)

        return new_conversation

    except Exception :
        await session.rollback()
        raise


async def create_message(
    content: str,
    conversation_id: UUID,
    role: str,
    session: AsyncSession,
    personality: Optional[str] = None,
    citations: Optional[List[Attachment]] = None
) -> Message:
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise ConversationNotFound(f"Conversation {conversation_id} not found")

    new_message = Message(
        conversation_id=conversation_id,
        content=content,
        role=role,
        personality=personality,
        citations=citations or []
    )
    try:
        session.add(new_message)
        await session.commit()
        await session.refresh(new_message)

        return new_message
    
    except Exception:
        await session.rollback()
        raise


async def update_message(
    message_id: UUID,
    conversation_id: UUID,
    new_message_content: str,
    user: User,
    session: AsyncSession
) -> Message:
    message_id = coerce_uuid(message_id)
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise ConversationNotFound(f"Converastion {conversation_id} not found.")

    if user.id != conversation.user_id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}.")

    message = await session.get(Message, message_id)
    if not message:
        raise MessageNotFound(f"Message {message_id} not found.")

    if message.conversation_id != conversation_id:
        raise MessageNotFound(f"Message {message_id} does not belong in conversation {conversation_id}.")
        
    try:
        message.content = new_message_content
        await session.commit()
        await session.refresh(message)
        return message
    except Exception:
        await session.rollback()
        raise


async def get_conversations(
    user: User,
    session: AsyncSession
) -> list[Conversation]:
    stmt = select(Conversation).where(
        Conversation.user_id == user.id
    ).order_by(
        Conversation.created_at.desc()
    )
    results = await session.scalars(stmt)
    return results.all()


async def get_conversation(
    id: UUID,
    user: User,
    session: AsyncSession
) -> Conversation:
    id = coerce_uuid(id)
    conversation = await session.get(Conversation, id)
    if not conversation:
        raise ConversationNotFound(f"Conversation {id} not found.")
    if user.id != conversation.user_id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {id}")
    return conversation


async def get_conversation_messages(
    conversation_id: UUID,
    user: User,
    session: AsyncSession
) -> list[Message]:
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    
    if conversation is None:
        raise ConversationNotFound(f"Conversation {conversation_id} not found")
    
    if user.id != conversation.user_id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}")
    
    results = await session.scalars(select(Message).where(Message.conversation_id == conversation_id))
    return results.all()


async def delete_conversation(
    conversation_id: UUID,
    user: User,
    session: AsyncSession
) -> dict:
    conversation_id = coerce_uuid(conversation_id)
    existing_conversation = await session.get(Conversation, conversation_id)
    if not existing_conversation:
        raise ConversationNotFound(f"Conversation {conversation_id} not found.")
    
    if user.id != existing_conversation.user_id:
        raise PermissionError(f'User {user.id} is not the owner of conversation {conversation_id}.')
    
    stmt = select(Attachment).where(Attachment.conversation_id == conversation_id)
    result = await session.execute(stmt)
    attachments_to_wipe = result.scalars().all()

    if attachments_to_wipe:
        cleanup_tasks = [
            remove_attachment(
                conversation_id=conversation_id,
                file_id=amt.id,
                storage_provider=amt.storage_provider,
                user=user,
                session=session
            )
            for amt in attachments_to_wipe
        ]
        await asyncio.gather(*cleanup_tasks)

    copy = existing_conversation
    try:
        await session.delete(existing_conversation)
        await session.commit()
        return copy
    except Exception:
        await session.rollback()
        raise


async def conversation_exist(
        conversation_id: UUID,
        session: AsyncSession
) -> Conversation | None:
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    return conversation


async def rename_conversation(
    conversation_id: UUID,
    new_name: str,
    user: User,
    session: AsyncSession
) -> Conversation:
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise ConversationNotFound(f"Conversation {conversation_id} not found.")

    if conversation.user_id != user.id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}")
    
    try:
        conversation.title = new_name
        await session.commit()
        await session.refresh(conversation)

        return conversation
    except Exception:
        await session.rollback()
        raise



async def create_attachment(
    conversation_id: UUID,
    file: UploadFile,
    storage_provider: StorageProvider,
    user: User,
    session: AsyncSession
) -> Attachment:
    conversation_id = coerce_uuid(conversation_id)
    print(f"\n[DEBUG create_attachment] Creating attachment...")
    print(f"  - conversation_id: {conversation_id}")
    print(f"  - filename: {file.filename}")
    print(f"  - storage_provider: {storage_provider}")

    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        print(f"[DEBUG create_attachment] ERROR: Conversation {conversation_id} not found.")
        raise ConversationNotFound(f"Conversation {conversation_id} not found.")

    if conversation.user_id != user.id:
        print(f"[DEBUG create_attachment] ERROR: User {user.id} is not the owner of conversation {conversation_id}.")
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}.")

    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../uploads/'))
    os.makedirs(uploads_dir, exist_ok=True)
    print(f"[DEBUG create_attachment] Uploads target folder: {uploads_dir}")

    file_id = uuid.uuid4()
    _, file_ext = os.path.splitext(file.filename)
    clean_ext = file_ext.lower().replace(".", "")
    loop = asyncio.get_running_loop()

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    print(f"[DEBUG create_attachment] File size determined: {file_size} bytes")

    fd, temp_local_path = tempfile.mkstemp(suffix=f".{clean_ext}")
    print(f"[DEBUG create_attachment] Created temporary local file: {temp_local_path}")
    try:
        with os.fdopen(fd, 'wb') as temp_buffer:
            shutil.copyfileobj(file.file, temp_buffer)
        print("[DEBUG create_attachment] Temporary buffer copy completed.")
        
        try:
            print("[DEBUG create_attachment] Executing ingest_docs...")
            await ingest_docs(
                file_path=temp_local_path,
                attachment_id=str(file_id),
                chunk_size=1000,
                chunk_overlap=200,
                user_id=str(user.id)
            )
            print("[DEBUG create_attachment] ingest_docs executed successfully.")
        except Exception as ingest_err:
            # Gracefully log ingestion error without aborting the actual storage upload
            import logging
            logging.warning(f"Resilient Ingestion: text chunking skipped/failed for {file.filename}: {str(ingest_err)}")
            print(f"[DEBUG create_attachment] WARNING: Ingestion skipped/failed: {str(ingest_err)}")
    finally:
        if os.path.exists(temp_local_path):
            os.remove(temp_local_path)
            print("[DEBUG create_attachment] Cleaned up temporary local file.")
    
    file.file.seek(0)

    if storage_provider == StorageProvider.GOOGLE_DRIVE:
        print("[DEBUG create_attachment] Uploading to Google Drive...")
        google_creds = await get_google_credentials(user.id, session)
        def upload_to_drive_sync():
            service = build('drive', 'v3', credentials=google_creds)
            
            file_metadata = {"name": f"{file_id}{file_ext}"}
            media = MediaIoBaseUpload(file.file, mimetype=file.content_type, resumable=True)

            drive_file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()

            return drive_file.get('id')
        
        final_storage_identifier = await loop.run_in_executor(None, upload_to_drive_sync)
        print(f"[DEBUG create_attachment] Google Drive Upload Success. ID: {final_storage_identifier}")

    elif storage_provider == StorageProvider.LOCAL:
        saved_filename = f'{file_id}{file_ext}'
        full_path = os.path.join(uploads_dir, saved_filename)
        print(f"[DEBUG create_attachment] Uploading locally to: {full_path}...")

        def save_file_sync():
            with open(full_path, 'wb') as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            return full_path

        final_storage_identifier = await loop.run_in_executor(None, save_file_sync)
        print(f"[DEBUG create_attachment] Local Upload Success. Path: {final_storage_identifier}")

    new_attachment = Attachment(
        id=file_id,
        conversation_id=conversation_id,
        file_name=file.filename or 'unnammed_file',
        file_path=final_storage_identifier,
        file_type=file.content_type or f"application/{clean_ext}",
        file_size=file_size,
        extracted_text=None,
        storage_provider=storage_provider
    )

    try:
        print("[DEBUG create_attachment] Committing attachment record to database...")
        session.add(new_attachment)
        await session.commit()
        await session.refresh(new_attachment)
        print(f"[DEBUG create_attachment] Attachment committed successfully with ID: {new_attachment.id}")
        return new_attachment
    except Exception:
        await session.rollback()
        raise


async def remove_attachment(
    conversation_id: UUID,
    file_id: UUID,
    storage_provider: StorageProvider,
    user: User,
    session: AsyncSession
) -> dict:
    conversation_id = coerce_uuid(conversation_id)
    file_id = coerce_uuid(file_id)
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise ConversationNotFound(f"Conversation {conversation_id} not found.")

    if conversation.user_id != user.id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}.")
    
    attachment = await session.get(Attachment, file_id)
    if not attachment:
        raise FileNotFoundError(f"File {file_id} not found in database.")

    attachment_data_copy = {
        "id": attachment.id,
        "file_name": attachment.file_name,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size,
        "created_at": attachment.created_at
    }

    loop = asyncio.get_running_loop()

    def uningest_vectors_sync():
        user_vector_store = _get_user_vector_store(user.id)
        user_vector_store.delete(where={'source_file_id': str(file_id)})
    
    await loop.run_in_executor(None, uningest_vectors_sync)


    if storage_provider == StorageProvider.GOOGLE_DRIVE:
        google_creds = await get_google_credentials(user.id, session)
        def delete_file_from_google_drive_sync():
            service = build('drive', 'v3', credentials=google_creds)
            service.files().delete(fileId=attachment.file_path).execute()
        
        await loop.run_in_executor(None, delete_file_from_google_drive_sync)
    
    else:
        def delete_file_from_disk(path_to_delete: str):
            if os.path.exists(path_to_delete):
                os.remove(path_to_delete)
            else:
                print(f"Warning: File path {path_to_delete} did not exist on disk.")
        
        
        await loop.run_in_executor(None, delete_file_from_disk, attachment.file_path)
    try:
        await session.delete(attachment)
        await session.commit()
        return attachment_data_copy
    
    except Exception:
        await session.rollback()
        raise


async def get_attachments(
    user: User,
    session: AsyncSession
) -> Optional[list[Attachment]]:
    stmt = select(Attachment).join(
        Conversation, Conversation.id == Attachment.conversation_id
    ).where(
        Conversation.user_id == user.id
    ).order_by(
        Attachment.created_at.desc()
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_conversation_attachments(
    conversation_id: UUID,
    user: User,
    session: AsyncSession
) -> Optional[List[Attachment]]:
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise ConversationNotFound(f"Conversation {conversation_id} not found.")
    
    if user.id != conversation.user_id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}.")

    stmt = select(Attachment).where(
        Attachment.conversation_id == conversation_id
    ).order_by(
        Attachment.created_at.desc()
    )

    results = await session.execute(stmt)
    return list(results.scalars().all())


async def get_citations(
    conversation_id: UUID,
    agent_response: Dict,
    session: AsyncSession
) -> List[Attachment]:
    conversation_id = coerce_uuid(conversation_id)
    source_filename = set()
    intermediate_steps = agent_response.get('intermediate_steps')
    if not intermediate_steps:
        return []
    
    for action, observation in intermediate_steps:
        if action.tool == 'retrieve_context':
            if isinstance(observation, (list, tuple)) and len(observation) > 1:
                raw_docs = observation[1]
                for doc in raw_docs:
                    local_source_path = doc.metadata.get('source')
                    if local_source_path:
                        source_filename.add(os.path.basename(local_source_path))
    if not source_filename:
        return []
    stmt = select(Attachment).where(
        Attachment.conversation_id == conversation_id,
        Attachment.file_name.in_(source_filename)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def get_infomation_source(
    message_id: UUID,
    conversation_id: UUID,
    user: User,
    session: AsyncSession
) -> Optional[List[Attachment]]:
    """
    Returns the collection of file attachments that were cited/used to generate 
    a specific assistant response message.
    """
    message_id = coerce_uuid(message_id)
    conversation_id = coerce_uuid(conversation_id)
    conversation = await session.get(Conversation, conversation_id)
    if not conversation:
        raise ConversationNotFound(f"Conversation {conversation_id} not found.")
    
    if user.id != conversation.user_id:
        raise PermissionError(f"User {user.id} is not the owner of conversation {conversation_id}")

    stmt = select(Message).where(
        Message.id == message_id,
        Message.conversation_id == conversation_id
    )

    result = await session.execute(stmt)
    message = result.scalar_one_or_none()
    if not message:
        raise ValueError(f"Message {message_id} not found in conversation {conversation_id}.")
    
    return getattr(message, 'citations', [])