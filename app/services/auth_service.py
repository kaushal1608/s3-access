from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud.user_repository import user_repository
from app.models.users import User, UserRole
from app.auth.jwt_handler import get_password_hash, verify_password, create_access_token
from app.schemas.auth import UserCreate, UserLogin
from app.logger import logger

class AuthService:
    def register_user(self, db: Session, user_data: UserCreate):
        logger.info(f"Registering user: {user_data.email}")
        if user_repository.get_by_email(db, user_data.email):
            logger.warning(f"Registration failed: Email {user_data.email} already exists")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email, 
            password_hash=hashed_password, 
            role=UserRole.USER
        )
        created_user = user_repository.create(db, new_user)
        logger.info(f"User registered successfully: {created_user.id}")
        return created_user

    def authenticate_user(self, db: Session, login_data: UserLogin):
        logger.info(f"Authenticating user: {login_data.email}")
        user = user_repository.get_by_email(db, login_data.email)
        if not user or not verify_password(login_data.password, user.password_hash):
             logger.warning(f"Authentication failed for {login_data.email}")
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"User authenticated: {user.id}")
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role, "user_id": user.id}
        )
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email
        }

auth_service = AuthService()
