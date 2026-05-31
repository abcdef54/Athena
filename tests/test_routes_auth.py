import pytest
from httpx import AsyncClient
from sqlalchemy import select
from src.backend.database.models import User

pytestmark = pytest.mark.asyncio

async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register a new user
    reg_payload = {
        "email": "newuser@example.com",
        "password": "strongpassword123",
        "is_active": True,
        "is_verified": False,
        "is_superuser": False
    }
    
    response = await client.post("/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data

    # 2. Login with registered user (uses x-www-form-urlencoded)
    login_payload = {
        "username": "newuser@example.com",
        "password": "strongpassword123"
    }
    
    response = await client.post("/auth/jwt/login", data=login_payload)
    assert response.status_code == 200
    login_data = response.json()
    assert "token_type" in login_data
    assert login_data["token_type"] == "bearer"
    assert "access_token" in login_data
    
    token = login_data["access_token"]

    # 3. Retrieve user profile using the JWT token
    headers = {"Authorization": f"Bearer {token}"}
    profile_response = await client.get("/users/me", headers=headers)
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["email"] == "newuser@example.com"

    # 4. Attempt login with wrong password
    bad_login_payload = {
        "username": "newuser@example.com",
        "password": "wrongpassword"
    }
    bad_response = await client.post("/auth/jwt/login", data=bad_login_payload)
    assert bad_response.status_code == 400


async def test_unauthenticated_access_users_me(client: AsyncClient):
    # Retrieve profile without headers
    response = await client.get("/users/me")
    assert response.status_code == 401
