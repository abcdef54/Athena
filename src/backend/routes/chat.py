import os
import dotenv

from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.auth import current_active_user
from src.backend.agents import make_agent
from src.backend.database.exceptions import ConversationNotFound
from src.backend.database.session import get_async_session
from src.backend.database.schemas import ChatRequest, ChatResponse
from src.backend.database.models import User
from src.backend.database import crud

dotenv.load_dotenv()

router = APIRouter(prefix='/chat', tags=['chat'])

AGENTS = {
    'general': make_agent('general'),
    'researcher': make_agent('researcher'),
    'coder': make_agent('coder'),
    'genz': make_agent('genz'),
    'unhinged': make_agent('unhinged'),
    'assistant': make_agent('assistant')
}

@router.post("")
async def chat(
    request: ChatRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> ChatResponse:
    print(f"\n[DEBUG /chat] Starting chat invocation...")
    print(f"  - user_id: {user.id}")
    print(f"  - conversation_id: {request.conversation_id}")
    print(f"  - content: '{request.content[:50]}...'")
    print(f"  - deep_think: {request.deep_think}")
    try:
        full_chat = []

        print("[DEBUG /chat] Fetching conversation messages history...")
        history = await crud.get_conversation_messages(
            conversation_id=request.conversation_id,
            user=user,
            session=session
        )
        print(f"[DEBUG /chat] Found {len(history)} previous messages in history.")

        print("[DEBUG /chat] Creating new user message in DB...")
        message = await crud.create_message(
            content=request.content,
            conversation_id=request.conversation_id,
            role="user",
            personality=None,
            session=session
        )  
        print(f"[DEBUG /chat] User message created successfully with ID: {message.id}")

        if history:
            full_chat = [
                {"role": "user", "content": msg.content} if msg.role == 'user'
                else {"role": "assistant", "content": msg.content}
                for msg in history if msg.id != message.id
            ]

        full_chat.append({"role": "user", "content": request.content})

        config = {
            'configurable': {
                'user_id': str(user.id),
                'deep_think': request.deep_think
            },
            'metadata': {'conversation_id': str(request.conversation_id)} 
        }

        print("[DEBUG /chat] Invoking LangChain agent...")
        agent_response = await AGENTS.get(request.personality, AGENTS["general"]).ainvoke({
            'messages': full_chat,
            }, 
            config=config
        )
        print("[DEBUG /chat] Agent invocation completed successfully.")

        response_content = None
        if isinstance(agent_response, dict):
            if "output" in agent_response and agent_response["output"] is not None:
                response_content = agent_response["output"]
            elif "messages" in agent_response and agent_response["messages"]:
                last_msg = agent_response["messages"][-1]
                if hasattr(last_msg, "content"):
                    content = last_msg.content
                    if isinstance(content, str):
                        response_content = content
                    elif isinstance(content, list):
                        text_parts = []
                        for part in content:
                            if isinstance(part, dict):
                                if part.get("type") == "text" and "text" in part:
                                    text_parts.append(part["text"])
                                elif "text" in part:
                                    text_parts.append(part["text"])
                            elif isinstance(part, str):
                                text_parts.append(part)
                            elif hasattr(part, "text"):
                                text_parts.append(part.text)
                        if text_parts:
                            response_content = "".join(text_parts)

        print(f"[DEBUG /chat] Extracted response content (first 80 chars): '{response_content[:80] if response_content else None}...'")

        if not response_content:
            print("[DEBUG /chat] WARNING: response_content was empty, using fallback error response.")
            response_content = "I encountered a processing error."

        print("[DEBUG /chat] Fetching citations/sources...")
        citations = await crud.get_citations(
            conversation_id=request.conversation_id,
            agent_response=agent_response,
            session=session
        )
        print(f"[DEBUG /chat] Found {len(citations)} citations.")
    
        print("[DEBUG /chat] Creating assistant response message in DB...")
        assistant_message = await crud.create_message(
            content = response_content,
            conversation_id=request.conversation_id,
            role="assistant",
            session=session,
            citations=citations,
            personality=request.personality
        )
        print(f"[DEBUG /chat] Assistant message saved successfully with ID: {assistant_message.id}")

        return ChatResponse(
            id=assistant_message.id,
            conversation_id=assistant_message.conversation_id,
            content=assistant_message.content,
            role=assistant_message.role,
            personality=assistant_message.personality,
            created_at=assistant_message.created_at
        )

    except ConversationNotFound as e:
        print(f"[DEBUG /chat] EXCEPTION: ConversationNotFound: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"[DEBUG /chat] CRITICAL RUNTIME EXCEPTION:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.patch("/{chat_id}")
async def update_message(
    chat_id: str,
    new_chat: ChatRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> ChatResponse:
    try:
        new_message = await crud.update_message(
            message_id=chat_id,
            conversation_id=new_chat.conversation_id,
            new_message_content=new_chat.content,
            user=user,
            session=session
        )

        # RETURN THE SAVED MESSAGE SNAPSHOT, NOT A NEW CHAT EXECUTION
        return ChatResponse(
            id=new_message.id,
            conversation_id=new_message.conversation_id,
            content=new_message.content,
            role=new_message.role,
            personality=new_message.personality,
            created_at=new_message.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))