from fastapi import HTTPException, Depends, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from src.backend.database.session import get_async_session
from src.backend.database.models import User
from src.backend.database.schemas import ConversationCreate, ConversationResponse, ChatResponse, AttachmentReponse
from src.backend.database.exceptions import ConversationNotFound
from src.backend.database import crud
from src.backend.auth import current_active_user


router = APIRouter(prefix='/conversation', tags=['conversations'])


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    conversation_create: ConversationCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> ConversationResponse:
    try:
        conversation = await crud.create_conversation(
            title=conversation_create.title,
            user=user,
            session=session
        )
        return ConversationResponse.model_validate(conversation)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[ConversationResponse])
async def get_conversations(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> list[ConversationResponse]:
    try:
        conversations = await crud.get_conversations(user, session)
        return conversations
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=ConversationResponse)
async def get_conversation(
    id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> ConversationResponse:
    try:
        conversation = await crud.get_conversation(id, user, session)
        return ConversationResponse.model_validate(conversation)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}/messages", response_model=list[ChatResponse])
async def get_conversation_messages(
    conversation_id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> list[ChatResponse]:
    try:
        conversation = await crud.get_conversation(conversation_id, user, session)
        if conversation.user_id != user.id:
            raise HTTPException(status_code=403, detail="Permission denied to view session log data.")

        messages = await crud.get_conversation_messages(
            conversation_id=conversation_id,
            user=user,
            session=session
        )
        return [ChatResponse.model_validate(m) for m in messages]
    except ConversationNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/{conversation_id}/messages/{message_id}/sources', response_model=list[AttachmentReponse])
async def get_message_sources(
    conversation_id: str,
    message_id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> list[AttachmentReponse]:
    try:
        citations = await crud.get_infomation_source(
            message_id=message_id,
            conversation_id=conversation_id,
            user=user,
            session=session
        )

        return citations
    except ConversationNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected error occurred while fetching citation sources: {str(e)}"
        )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation(
    conversation_id: str,
    new_name: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> ConversationResponse:
    try:
        updated_conversation = await crud.rename_conversation(
            conversation_id=conversation_id,
            new_name=new_name,
            user=user,
            session=session
        )
        return ConversationResponse.model_validate(updated_conversation)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{conversation_id}", response_model=ConversationResponse)
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> ConversationResponse:
    try:
        deleted = await crud.delete_conversation(
            conversation_id=conversation_id,
            user=user,
            session=session
        )
        return ConversationResponse.model_validate(deleted)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))