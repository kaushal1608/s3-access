from app.services.auth_service import auth_service
from app.schemas.auth import UserCreate
from app.models.users import UserRole

def test_register_user_success(db_session):
    user_data = UserCreate(email="newuser@example.com", password="password123")
    user = auth_service.register_user(db_session, user_data)
    
    assert user.email == "newuser@example.com"
    assert user.id is not None
    assert user.role == UserRole.USER
    # Hashing check roughly
    assert user.password_hash != "password123"

def test_authenticate_user_success(db_session):
    # Register first
    user_data = UserCreate(email="authuser@example.com", password="password123")
    auth_service.register_user(db_session, user_data)
    
    # Authenticate
    from app.schemas.auth import UserLogin
    login_data = UserLogin(email="authuser@example.com", password="password123")
    response = auth_service.authenticate_user(db_session, login_data)
    
    assert "access_token" in response
    assert response["token_type"] == "bearer"
    assert response["email"] == "authuser@example.com"
