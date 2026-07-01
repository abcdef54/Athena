from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, BigInteger, Float, Boolean, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func

import uuid
import datetime

class Base(DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    summary = Column(Text, nullable=True)
    message_count = Column(Integer, nullable=False, default=0)
    unsummarized_message_count = Column(Integer, nullable=False, default=0)

    messages = relationship("Message", back_populates="conversation", passive_deletes=True, cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="conversation", passive_deletes=True, cascade="all, delete-orphan")


message_attachments = Table(
    'message_attachments',
    Base.metadata,
    Column('message_id', UUID(as_uuid=True), ForeignKey('messages.id', ondelete='CASCADE'), primary_key=True),
    Column('attachment_id', UUID(as_uuid=True), ForeignKey('attachments.id', ondelete='CASCADE'), primary_key=True)
)

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), nullable=False, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    personality = Column(String(50), nullable=True)
    model_name = Column(String(50), nullable=True)
    reasoning_mode = Column(String(20), nullable=True)
    temperature = Column(Float, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    citations = relationship('Attachment', secondary=message_attachments, lazy='selectin')
    conversation = relationship("Conversation", back_populates="messages", passive_deletes=True)


class Attachment(Base):
    __tablename__ = 'attachments'

    id = Column(UUID(as_uuid=True), nullable=False, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id', ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    conversation = relationship('Conversation', back_populates="attachments", passive_deletes=True)

class InstalledModel(Base):
    __tablename__ = "installed_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Display in the UI
    display_name = Column(String, nullable=False)
    # Name sent to llama-swap/OpenAI API
    model_name = Column(String, nullable=False, unique=True)
    hf_repo = Column(String, nullable=False)
    gguf_file = Column(String, nullable=False)
    local_path = Column(String, nullable=False)
    quantization = Column(String, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    installed_at = Column(DateTime, server_default=func.now())
    is_default = Column(Boolean, nullable=False, default=False)