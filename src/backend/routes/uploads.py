from fastapi import UploadFile, HTTPException, Depends, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from src.backend.database.session import get_async_session
from src.backend.database.models import User, StorageProvider
from src.backend.database.exceptions import ConversationNotFound
from src.backend.database.schemas import AttachmentCreate, AttachmentReponse
from src.backend.database import crud
from src.backend.auth import current_active_user


router = APIRouter(prefix='/uploads', tags=['uploads'])

@router.get("", response_model=list[AttachmentReponse])
async def get_attachments(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> list[AttachmentReponse]:
    try:
        attachments = await crud.get_attachments(user=user, session=session)
        return [
            AttachmentReponse(
                id=a.id,
                file_name=a.file_name,
                file_type=a.file_type,
                file_size=a.file_size,
                storage_provider=a.storage_provider,
                created_at=a.created_at
            ) for a in attachments
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversation/{conversation_id}", response_model=list[AttachmentReponse])
async def get_conversation_attachments(
    conversation_id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> list[AttachmentReponse]:
    try:
        attachments = await crud.get_conversation_attachments(
            conversation_id=conversation_id,
            user=user,
            session=session
        )
        return [
            AttachmentReponse(
                id=a.id,
                file_name=a.file_name,
                file_type=a.file_type,
                file_size=a.file_size,
                storage_provider=a.storage_provider,
                created_at=a.created_at
            ) for a in attachments
        ]
    except ConversationNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def upload_file(
    conversation_id: str,
    file: UploadFile,
    provider: StorageProvider,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> AttachmentReponse:
    print(f"\n[DEBUG /uploads] Starting file upload...")
    print(f"  - conversation_id: {conversation_id}")
    print(f"  - filename: {file.filename}")
    print(f"  - content_type: {file.content_type}")
    print(f"  - provider: {provider}")
    print(f"  - user: {user.email}")
    try:
        attachment = await crud.create_attachment(
            conversation_id=conversation_id,
            file=file,
            storage_provider=provider,
            user=user,
            session=session
        )
        print(f"[DEBUG /uploads] File upload completed successfully. Attachment ID: {attachment.id}")

        return AttachmentReponse(
            id=attachment.id,
            file_name=attachment.file_name,
            file_type=attachment.file_type,
            file_size=attachment.file_size,
            storage_provider=provider,
            created_at=attachment.created_at
        )
    except PermissionError as e:
        print(f"[DEBUG /uploads] PermissionError: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        import traceback
        print(f"[DEBUG /uploads] EXCEPTION during file processing:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"File processing system error: {str(e)}")


@router.delete("/conversation/{conversation_id}/{file_id}")
async def delete_upload(
    conversation_id: str,
    file_id: str,
    provider: StorageProvider,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> AttachmentReponse:
    try:
        attachment = await crud.remove_attachment(
            conversation_id=conversation_id,
            file_id=file_id,
            storage_provider=provider,
            user=user,
            session=session
        )

        return AttachmentReponse(
            id=attachment["id"],
            file_name=attachment["file_name"],
            file_type=attachment["file_type"],
            file_size=attachment["file_size"],
            storage_provider=provider,
            created_at=attachment["created_at"]
        )
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))
