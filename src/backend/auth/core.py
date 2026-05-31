import os
import dotenv
import time
import asyncio
from uuid import UUID
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    JWTStrategy,
    BearerTransport,
    AuthenticationBackend
)
from fastapi_users.db import SQLAlchemyUserDatabase
from httpx_oauth.clients.google import GoogleOAuth2
from google.oauth2.credentials import Credentials

from src.backend.database.models import User, UserOAuthToken
from src.backend.database.session import get_user_db, async_session_maker

dotenv.load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY = os.getenv("JWT_SECRET_KEY")






google_oauth_client = GoogleOAuth2(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    scopes=[
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/gmail.readonly"
    ]
)

# MONKEY PATCH: Intercept get_authorization_url to force offline consent params
original_get_authorization_url = google_oauth_client.get_authorization_url

async def patched_get_authorization_url(*args, **kwargs):
    # httpx_oauth expects extra query parameters to be passed via the extras_params dict
    extras_params = kwargs.get("extras_params") or {}
    extras_params["access_type"] = "offline"
    extras_params["prompt"] = "consent"
    kwargs["extras_params"] = extras_params
    return await original_get_authorization_url(*args, **kwargs)

# Override the client instance method with our patched version
google_oauth_client.get_authorization_url = patched_get_authorization_url





async def get_google_credentials(
    user_id: UUID,
    session: AsyncSession
) -> Credentials:
    stmt = select(UserOAuthToken).where(
        UserOAuthToken.user_id == user_id,
        UserOAuthToken.oauth_name == 'google'
    )
    result = await session.execute(stmt)
    tokens = result.scalar_one_or_none()

    if not tokens:
        raise ValueError(f"User {user_id} has not linked their Google Drive account yet.")
    
    google_creds = Credentials(
        token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=tokens.scopes.split(",") if tokens.scopes else [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/gmail.readonly"
        ]
    )
    current_time = int(time.time())
    if google_creds.expired or (tokens.expires_at and tokens.expires_at <= current_time):
        print(f"Access token for user {user_id} expired. Initializing OAuth2 Refresh Handshake...")
        loop = asyncio.get_running_loop()

        def refresh_sync():
            google_creds.refresh(Request())
        
        await loop.run_in_executor(None, refresh_sync)

        tokens.access_token = google_creds.token
        tokens.expires_at = int(time.time()) + 3600

        await session.commit()
        print(f"Access token for {user_id} has been refresh. Valid for next 60 mins.")
    
    return google_creds












bearer = BearerTransport('auth/jwt/login')

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(SECRET_KEY, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer,
    get_strategy=get_jwt_strategy
)


class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    reset_password_token_secret = SECRET_KEY
    verification_token_secret = SECRET_KEY

    async def save_oauth_tokens(self, user: User, oauth_account: dict) -> None:
        """
        Custom helper to parse the token payload from the oauth client 
        and securely store or update the credentials in user_oauth_tokens.
        """
        account_id = oauth_account.get("account_id")
        account_email = oauth_account.get("account_email")
        refresh_token = oauth_account.get("refresh_token")
        access_token = oauth_account.get("access_token")
        scopes_str = ",".join(oauth_account.get("scopes", []))

        raw_expires_at = oauth_account.get("expires_at")
        if raw_expires_at:
            expires_at = int(raw_expires_at)    
        else:
            import time
            expires_at = int(time.time()) + 3600

        scopes_str = ",".join(oauth_account.get("scopes", []))

        async with async_session_maker() as session:
            from sqlalchemy import select

            stmt = select(UserOAuthToken).where(
                UserOAuthToken.user_id == user.id,
                UserOAuthToken.oauth_name == 'google'
            )

            result = await session.execute(stmt)
            existing_token = result.scalar_one_or_none()

            if existing_token:
                if access_token:
                    existing_token.access_token = access_token
                if refresh_token:
                    existing_token.refresh_token = refresh_token
                if expires_at:
                    existing_token.expires_at = expires_at
                if account_id:
                    existing_token.account_id = account_id
                if account_email:
                    existing_token.account_email = account_email
                if scopes_str:
                    existing_token.scopes = scopes_str
                print(f"Google OAuth tokens updated for user: {user.email}")
            else:
                if not refresh_token:
                    print("WARNING: No refresh token returned! Ensure 'access_type=offline' is forced.")
                
                new_token = UserOAuthToken(
                    user_id=user.id,
                    oauth_name="google",
                    account_id=account_id,
                    account_email=account_email,
                    access_token=access_token,
                    refresh_token=refresh_token or "",
                    expires_at=expires_at,
                    scopes=scopes_str
                )
                session.add(new_token)
            
            await session.commit()

    async def on_after_register(self, user: User, oauth_account: dict, request: Optional[Request] = None):
        print(f"User {user.id} has successfully registered via email: {user.email}")
        if isinstance(oauth_account, dict) and "account_id" in oauth_account:
            print(f"User registered via Google OAuth. Capturing security tokens...")
            await self.save_oauth_tokens(user, oauth_account)
            print(f"Security tokens captured.")
        

    async def on_after_login(self, user: User, oauth_account: dict, request: Optional[Request] = None, response: Optional[Any] = None):
        print(f"User {user.id} logged in successfully.")
        if isinstance(oauth_account, dict) and "account_id" in oauth_account:
            print(f"User logged in via Google OAuth. Syncing security tokens...")
            await self.save_oauth_tokens(user, oauth_account)
            print("Tokens synced")


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_user_client = FastAPIUsers[User, UUID](
    get_user_manager,
    [auth_backend]
)

current_active_user = fastapi_user_client.current_user(active=True)