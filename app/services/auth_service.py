from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud.user_repository import user_repository
from app.models.users import User, UserRole, AuthType
from app.models.ldap_config import LdapConfig
from app.auth.jwt_handler import get_password_hash, verify_password, create_access_token
from app.schemas.auth import UserCreate, UserLogin, PasswordChange
from app.services.ldap_service import authenticate_ldap_user, decrypt_password
from ldap3.utils.conv import escape_filter_chars
from app.logger import logger


def _mask_email(email: str) -> str:
    """Mask email for safe logging: he***@domain.com"""
    parts = email.split('@')
    if len(parts) == 2:
        name = parts[0]
        return f"{name[:2]}***@{parts[1]}" if len(name) > 2 else f"{name[0]}***@{parts[1]}"
    return "***"

def _mask_identifier(identifier: str) -> str:
    """Mask identifier (EIN or username) for safe logging"""
    if not identifier:
        return "***"
    if len(identifier) > 4:
        return f"{identifier[:2]}***{identifier[-1]}"
    if len(identifier) > 2:
        return f"{identifier[0]}***"
    return "***"


class AuthService:
    def register_user(self, db: Session, user_data: UserCreate):
        logger.info(f"Registering user: {_mask_email(user_data.email)}")
        if user_repository.get_by_email(db, user_data.email):
            logger.warning(f"Registration failed: Email {_mask_email(user_data.email)} already exists")
            raise HTTPException(status_code=400, detail="Email already registered")

        # Password strength validation
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )

        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            role=UserRole.USER,
            auth_type=AuthType.LOCAL
        )
        created_user = user_repository.create(db, new_user)
        logger.info(f"User registered successfully: {created_user.id}")
        return created_user

    def authenticate_user(self, db: Session, login_data: UserLogin):
        """
        Authenticate user via local DB or LDAP/AD.
        Determined by login_data.auth_method.
        """
        if login_data.auth_method == "ldap":
            return self._authenticate_ldap(db, login_data)
        else:
            return self._authenticate_local(db, login_data)

    def _authenticate_local(self, db: Session, login_data: UserLogin):
        """Standard local authentication with bcrypt-hashed password."""
        if not login_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required for local login"
            )

        logger.info(f"Local auth for: {_mask_email(login_data.email)}")
        user = user_repository.get_by_email(db, login_data.email)
        if not user or not user.password_hash or not verify_password(login_data.password, user.password_hash):
            logger.warning(f"Local auth failed for {_mask_email(login_data.email)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info(f"Local auth success: user_id={user.id}")
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role, "user_id": user.id, "auth_type": user.auth_type}
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "auth_type": user.auth_type
        }

    def _authenticate_ldap(self, db: Session, login_data: UserLogin):
        """
        LDAP/AD authentication flow:
        1. Get LDAP config from DB
        2. Determine search filter (EIN vs username)
        3. Authenticate user against AD (password sent over TLS, never stored)
        4. Auto-provision local user record (no password stored)
        5. Issue JWT token
        """
        # Get LDAP config
        ldap_config = db.query(LdapConfig).filter(LdapConfig.is_enabled == True).first()
        if not ldap_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LDAP authentication is not configured"
            )

        # Decrypt the bind password
        try:
            bind_password = decrypt_password(ldap_config.bind_password_encrypted)
        except ValueError as e:
            logger.error(f"Failed to decrypt bind password: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LDAP configuration error. Contact administrator."
            )

        # Determine what the user is logging in with:
        # Priority: identifier (EIN) > ldap_username > email prefix
        ldap_identifier = login_data.identifier or login_data.ldap_username
        
        if not ldap_identifier and login_data.email:
            ldap_identifier = login_data.email.split("@")[0]
        
        if not ldap_identifier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee ID or username is required for LDAP login"
            )

        # Determine which search filter to use
        # If identifier looks like a pure number (EIN), use ein_search_filter
        # Otherwise use the standard user_search_filter (sAMAccountName)
        if login_data.identifier and login_data.identifier.strip().isdigit():
            # EIN / Employee ID — use EIN search filter
            search_filter = getattr(ldap_config, 'ein_search_filter', None) or "(&(objectClass=user)(employeeID={ein}))"
            search_filter = search_filter.replace("{ein}", escape_filter_chars(ldap_identifier))
            logger.info(f"LDAP auth with EIN: {_mask_identifier(ldap_identifier)}")
        else:
            # Username / sAMAccountName — use standard filter
            search_filter = ldap_config.user_search_filter
            logger.info(f"LDAP auth with username: {_mask_identifier(ldap_identifier)}")

        # Authenticate against AD — password is verified by AD, never stored here
        success, user_info, message = authenticate_ldap_user(
            server_url=ldap_config.server_url,
            bind_dn=ldap_config.bind_dn,
            bind_password=bind_password,
            base_dn=ldap_config.base_dn,
            user_search_base=ldap_config.user_search_base,
            user_search_filter=search_filter,
            username=ldap_identifier,
            password=login_data.password,  # Sent to AD, never stored
            email_attribute=ldap_config.email_attribute,
            username_attribute=ldap_config.username_attribute,
            ein_attribute=getattr(ldap_config, 'ein_attribute', 'employeeID'),
            use_ssl=ldap_config.use_ssl,
            use_tls=ldap_config.use_tls,
            ad_domain=ldap_config.ad_domain,
            validate_cert=getattr(ldap_config, 'validate_cert', False),
            ca_cert_path=getattr(ldap_config, 'ca_cert_path', None)
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=message,
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Auto-provision or update local user (no password stored!)
        user_email = user_info.get("email", "")
        if not user_email or user_email == '[]':
            # Fallback: construct email from username@domain
            uname = user_info.get("username", ldap_identifier)
            domain = ldap_config.ad_domain or "ldap.local"
            user_email = f"{uname}@{domain}"

        user = user_repository.get_by_email(db, user_email)

        if not user:
            # Create new LDAP user — NO password_hash stored
            logger.info(f"Auto-provisioning LDAP user: {user_email}")
            user = User(
                email=user_email,
                password_hash=None,  # LDAP users have no local password
                role=UserRole.USER,
                auth_type=AuthType.LDAP
            )
            user = user_repository.create(db, user)
        elif user.auth_type != AuthType.LDAP:
            # User exists as local, update to LDAP
            user.auth_type = AuthType.LDAP
            db.commit()

        logger.info(f"LDAP auth success: {user.id} ({user_email})")
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role, "user_id": user.id, "auth_type": AuthType.LDAP}
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "auth_type": AuthType.LDAP
        }

    def change_password(self, db: Session, user: User, password_data: PasswordChange):
        """
        Change password — ONLY for local users.
        LDAP users must change their password via Active Directory.
        """
        if user.auth_type == AuthType.LDAP:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="LDAP users must change their password through Active Directory"
            )

        if not user.password_hash or not verify_password(password_data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )

        if len(password_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters"
            )

        user.password_hash = get_password_hash(password_data.new_password)
        db.commit()
        logger.info(f"Password changed for user: {user.id}")
        return {"message": "Password updated successfully"}


auth_service = AuthService()
