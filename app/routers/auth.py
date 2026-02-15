from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    UserCreate, UserLogin, Token, UserResponse, PasswordChange,
    LdapConfigCreate, LdapConfigResponse, LdapConfigUpdate, LdapTestRequest
)
from app.services.auth_service import auth_service
from app.services.ldap_service import encrypt_password, test_ldap_connection
from app.models.ldap_config import LdapConfig
from app.models.users import User
from app.auth.dependencies import get_current_user, get_admin_user
from app.logger import logger
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ==========================================
# Standard Auth Endpoints
# ==========================================

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    return auth_service.register_user(db, user)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    return auth_service.authenticate_user(db, user)


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password — only for local users. LDAP users are blocked."""
    return auth_service.change_password(db, current_user, password_data)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info including role and auth_type."""
    return current_user


# ==========================================
# LDAP Status (any user can check)
# ==========================================

@router.get("/ldap/status")
def ldap_status(db: Session = Depends(get_db)):
    """Check if LDAP authentication is enabled (public — shown on login page)."""
    config = db.query(LdapConfig).filter(LdapConfig.is_enabled == True).first()
    return {
        "ldap_enabled": config is not None,
        "ad_domain": config.ad_domain if config else None
    }


# ==========================================
# LDAP Admin Endpoints (admin role required)
# ==========================================

@router.get("/ldap/config", response_model=LdapConfigResponse)
def get_ldap_config(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get LDAP configuration (admin only). Bind password is never returned."""
    config = db.query(LdapConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="LDAP not configured")
    return config


@router.post("/ldap/config", response_model=LdapConfigResponse)
def create_ldap_config(
    config_data: LdapConfigCreate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create LDAP configuration (admin only). Bind password is encrypted before storage."""
    # Only one LDAP config allowed
    existing = db.query(LdapConfig).first()
    if existing:
        raise HTTPException(status_code=400, detail="LDAP config already exists. Use PUT to update.")

    # Encrypt bind password before storing
    encrypted_bind_password = encrypt_password(config_data.bind_password)

    ldap_config = LdapConfig(
        is_enabled=config_data.is_enabled,
        server_url=config_data.server_url,
        base_dn=config_data.base_dn,
        user_search_base=config_data.user_search_base,
        bind_dn=config_data.bind_dn,
        bind_password_encrypted=encrypted_bind_password,
        user_search_filter=config_data.user_search_filter,
        ein_search_filter=config_data.ein_search_filter,
        email_attribute=config_data.email_attribute,
        username_attribute=config_data.username_attribute,
        ein_attribute=config_data.ein_attribute,
        ad_domain=config_data.ad_domain,
        use_ssl=config_data.use_ssl,
        use_tls=config_data.use_tls
    )

    db.add(ldap_config)
    db.commit()
    db.refresh(ldap_config)

    logger.info(f"LDAP config created by admin {admin_user.email}")
    return ldap_config


@router.put("/ldap/config", response_model=LdapConfigResponse)
def update_ldap_config(
    config_data: LdapConfigUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update LDAP configuration (admin only)."""
    config = db.query(LdapConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="LDAP not configured. Use POST to create.")

    update_fields = config_data.model_dump(exclude_unset=True)

    # If bind_password is being updated, encrypt it
    if "bind_password" in update_fields and update_fields["bind_password"]:
        config.bind_password_encrypted = encrypt_password(update_fields.pop("bind_password"))

    # Update other fields
    for key, value in update_fields.items():
        if hasattr(config, key):
            setattr(config, key, value)

    db.commit()
    db.refresh(config)

    logger.info(f"LDAP config updated by admin {admin_user.email}")
    return config


@router.delete("/ldap/config")
def delete_ldap_config(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete LDAP configuration (admin only)."""
    config = db.query(LdapConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="LDAP not configured")

    db.delete(config)
    db.commit()

    logger.info(f"LDAP config deleted by admin {admin_user.email}")
    return {"message": "LDAP configuration deleted"}


@router.post("/ldap/test")
def test_ldap(
    test_data: LdapTestRequest,
    admin_user: User = Depends(get_admin_user)
):
    """Test LDAP connection with provided settings (admin only)."""
    success, message = test_ldap_connection(
        server_url=test_data.server_url,
        bind_dn=test_data.bind_dn,
        bind_password=test_data.bind_password,
        base_dn=test_data.base_dn,
        use_ssl=test_data.use_ssl,
        use_tls=test_data.use_tls
    )
    return {"success": success, "message": message}
