from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Enum, Table, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, DeclarativeBase, declared_attr
from sqlalchemy.sql import func

from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyBaseOAuthAccountTableUUID

import uuid
import datetime
import enum

class Base(DeclarativeBase):
    pass


class StorageProvider(enum.Enum):
    LOCAL = 'local'
    GOOGLE_DRIVE = 'google_drive'


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"

    # messages = relationship("Message", back_populates="user", passive_deletes=True, cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", passive_deletes=True, cascade="all, delete-orphan")
    oauth_accounts = relationship('UserOAuthToken', lazy='selectin', back_populates='user', passive_deletes=True, cascade="all, delete-orphan")
    
    preview_turn_useds = Column(Integer, default=0, server_default=text("0"))
    max_preview_turn = Column(Integer, default=3, server_default=text("3"))

    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class UserOAuthToken(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    __tablename__ = 'user_oauth_tokens'

    @declared_attr
    def user_id(cls):
        return Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # MANUAL COLUMNS (The extra info your specific app needs to track):
    account_email = Column(String(255), nullable=False)
    scopes = Column(Text)
    deleted_at = Column(DateTime, nullable=True)

    # RELATIONSHIPS (Tells SQLAlchemy how to join tables in queries):
    user = relationship('User', back_populates='oauth_accounts')

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="conversations", passive_deletes=True)
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
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    citations = relationship('Attachment', secondary=message_attachments, lazy='selectin')
    conversation = relationship("Conversation", back_populates="messages", passive_deletes=True)


class Attachment(Base):
    __tablename__ = 'attachments'

    id = Column(UUID(as_uuid=True), nullable=False, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id', ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    # Local mode: contains full string path (e.g., "../../uploads/xyz.pdf")
    # Google Drive mode: contains Google Drive File ID (e.g., "1pzschX3uMbxU...")
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    extracted_text = Column(Text, nullable=True)
    storage_provider = Column(Enum(StorageProvider), default=StorageProvider.LOCAL, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    conversation = relationship('Conversation', back_populates="attachments", passive_deletes=True)