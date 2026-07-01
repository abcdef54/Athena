from fastapi import UploadFile, HTTPException, Depends, APIRouter
from src.backend.database.exceptions import ConversationNotFound
from src.backend.database.schemas import AttachmentReponse
from src.backend.services.attachment_services import AttachmentService
from src.backend.routes.dependencies import get_attachment_service


router = APIRouter(prefix='/uploads', tags=['uploads'])

@router.get("", response_model=list[AttachmentReponse])
async def get_attachments(
    attachment_service: AttachmentService = Depends(get_attachment_service)
) -> list[AttachmentReponse]:
    try:
        attachments = await attachment_service.get_attachments()
        return [
            AttachmentReponse(
                id=a.id,
                file_name=a.file_name,
                file_type=a.file_type,
                file_size=a.file_size,
                created_at=a.created_at
            ) for a in attachments
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversation/{conversation_id}", response_model=list[AttachmentReponse])
async def get_conversation_attachments(
    conversation_id: str,
    attachment_service: AttachmentService = Depends(get_attachment_service)
) -> list[AttachmentReponse]:
    try:
        attachments = await attachment_service.get_conversation_attachments(
            conversation_id=conversation_id
        )
        return [
            AttachmentReponse(
                id=a.id,
                file_name=a.file_name,
                file_type=a.file_type,
                file_size=a.file_size,
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
    attachment_service: AttachmentService = Depends(get_attachment_service)
) -> AttachmentReponse:
    # print(f"\n[DEBUG /uploads] Starting file upload...")
    # print(f"  - conversation_id: {conversation_id}")
    # print(f"  - filename: {file.filename}")
    # print(f"  - content_type: {file.content_type}")
    try:
        attachment = await attachment_service.upload_attachment(
            conversation_id=conversation_id,
            file=file
        )
        # print(f"[DEBUG /uploads] File upload completed successfully. Attachment ID: {attachment.id}")

        return AttachmentReponse(
            id=attachment.id,
            file_name=attachment.file_name,
            file_type=attachment.file_type,
            file_size=attachment.file_size,
            created_at=attachment.created_at
        )
    except PermissionError as e:
        # print(f"[DEBUG /uploads] PermissionError: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        import traceback
        # print(f"[DEBUG /uploads] EXCEPTION during file processing:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"File processing system error: {str(e)}")


@router.delete("/conversation/{conversation_id}/{file_id}")
async def delete_upload(
    conversation_id: str,
    file_id: str,
    attachment_service: AttachmentService = Depends(get_attachment_service)
) -> AttachmentReponse:
    try:
        attachment = await attachment_service.delete_attachment(
            conversation_id=conversation_id,
            file_id=file_id
        )

        return AttachmentReponse(
            id=attachment["id"],
            file_name=attachment["file_name"],
            file_type=attachment["file_type"],
            file_size=attachment["file_size"],
            created_at=attachment["created_at"]
        )
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))
