import os
import dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.backend.database.schemas import UserUpdate, UserCreate, UserRead
from src.backend.database.session import create_db_and_table
from src.backend.auth import auth_backend, fastapi_user_client, google_oauth_client

from src.backend.routes import chat_router, conversation_router, uploads_router

dotenv.load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server Starting")
    await create_db_and_table()
    yield
    print("Shutting down Athena backend...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(conversation_router)
app.include_router(uploads_router)

app.include_router(fastapi_user_client.get_auth_router(auth_backend), prefix='/auth/jwt', tags=['auth'])
app.include_router(fastapi_user_client.get_register_router(UserRead, UserCreate), prefix='/auth', tags=['auth'])
app.include_router(fastapi_user_client.get_reset_password_router(), prefix='/auth', tags=['auth'])
app.include_router(fastapi_user_client.get_verify_router(UserRead), prefix='/auth', tags=['auth'])
app.include_router(fastapi_user_client.get_users_router(UserRead, UserUpdate), prefix='/users', tags=['users'])
app.include_router(
    fastapi_user_client.get_oauth_router(
        oauth_client=google_oauth_client,
        backend=auth_backend,
        state_secret=os.getenv("JWT_SECRET_KEY"),
        redirect_url="http://127.0.0.1:5500/src/frontend/index.html",
        associate_by_email=True,
        csrf_token_cookie_secure=False,
        csrf_token_cookie_httponly=False,
        csrf_token_cookie_samesite="lax",
    ),
    prefix='/auth/google',
    tags=['auth']
)