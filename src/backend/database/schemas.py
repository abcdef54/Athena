from src.backend.database.models import StorageProvider
import uuid
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from fastapi_users import schemas
from pydantic import ConfigDict


class ChatRequest(BaseModel):
    conversation_id: UUID
    content: str
    deep_think: bool


class ChatResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    content: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class ConversationCreate(BaseModel):
    user_id: str
    title: str


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)




class AttachmentCreate(BaseModel):
    file_name: str
    file_type: str
    file_size: int
    storage_provider: StorageProvider
    created_at: datetime


class AttachmentReponse(BaseModel):
    id: UUID
    file_name: str
    file_type: str
    file_size: int
    storage_provider: StorageProvider
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserRead(schemas.BaseUser[uuid.UUID]):
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass
