import os
import dotenv

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from src.backend.database.models import User, Base, UserOAuthToken
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase

dotenv.load_dotenv()

DB_URL = os.getenv('POSTGRESQL_URL')


engine = create_async_engine(DB_URL, echo=False)

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

async def create_db_and_table():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_async_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session

async def get_user_db(session: AsyncSession = Depends(get_async_session)) -> SQLAlchemyUserDatabase:
    yield SQLAlchemyUserDatabase(session, User, UserOAuthToken)