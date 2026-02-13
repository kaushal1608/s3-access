"""
LDAP/Active Directory Authentication Service

Security principles:
- NO AD user passwords are stored in the database
- Bind password for the service account is encrypted at rest using Fernet (AES-128-CBC)
- Authentication is done by attempting to bind as the user against AD
- If bind succeeds → user is authenticated (password is correct in AD)
- If bind fails → authentication fails
"""

import hashlib
import base64
from typing import Optional, Tuple
from cryptography.fernet import Fernet, InvalidToken
from ldap3 import Server, Connection, ALL, NTLM, SIMPLE, Tls
from ldap3.core.exceptions import LDAPBindError, LDAPSocketOpenError, LDAPException
from ldap3.utils.conv import escape_filter_chars
import ssl

from app.config import get_settings
from app.logger import logger

settings = get_settings()


def _get_fernet() -> Fernet:
    """
    Get Fernet cipher for encrypting/decrypting the LDAP bind password.
    Uses LDAP_ENCRYPTION_KEY if set, otherwise derives from SECRET_KEY.
    """
    key_source = settings.LDAP_ENCRYPTION_KEY or settings.SECRET_KEY
    # Derive a valid 32-byte Fernet key from the secret
    key_bytes = hashlib.sha256(key_source.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_password(plain_password: str) -> str:
    """Encrypt a password for storage (used for LDAP bind password only)."""
    f = _get_fernet()
    return f.encrypt(plain_password.encode()).decode()


def decrypt_password(encrypted_password: str) -> str:
    """Decrypt a stored password."""
    f = _get_fernet()
    try:
        return f.decrypt(encrypted_password.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt LDAP bind password - encryption key may have changed")
        raise ValueError("Failed to decrypt LDAP bind password. The encryption key may have changed.")


def _create_ldap_server(server_url: str, use_ssl: bool = False, use_tls: bool = True) -> Server:
    """Create an LDAP server connection object."""
    tls_config = None
    if use_ssl or use_tls:
        tls_config = Tls(validate=ssl.CERT_NONE)  # In production, use CERT_REQUIRED with CA cert

    return Server(
        server_url,
        use_ssl=use_ssl,
        tls=tls_config,
        get_info=ALL,
        connect_timeout=10
    )


def test_ldap_connection(
    server_url: str,
    bind_dn: str,
    bind_password: str,
    base_dn: str,
    use_ssl: bool = False,
    use_tls: bool = True
) -> Tuple[bool, str]:
    """
    Test LDAP connection with provided settings.
    Returns (success: bool, message: str)
    """
    try:
        server = _create_ldap_server(server_url, use_ssl, use_tls)
        conn = Connection(
            server,
            user=bind_dn,
            password=bind_password,
            authentication=SIMPLE,
            auto_bind=True,
            raise_exceptions=True
        )

        # Try a simple search to verify
        conn.search(base_dn, '(objectClass=*)', search_scope='BASE')
        conn.unbind()

        return True, "LDAP connection successful"

    except LDAPBindError as e:
        logger.error(f"LDAP bind failed: {e}")
        return False, f"LDAP bind failed: Invalid credentials for bind DN"

    except LDAPSocketOpenError as e:
        logger.error(f"LDAP connection failed: {e}")
        return False, f"Cannot connect to LDAP server: {server_url}"

    except LDAPException as e:
        logger.error(f"LDAP error: {e}")
        return False, f"LDAP error: {str(e)}"

    except Exception as e:
        logger.error(f"Unexpected LDAP error: {e}")
        return False, f"Unexpected error: {str(e)}"


def authenticate_ldap_user(
    server_url: str,
    bind_dn: str,
    bind_password: str,
    base_dn: str,
    user_search_base: Optional[str],
    user_search_filter: str,
    username: str,
    password: str,
    email_attribute: str = "mail",
    username_attribute: str = "sAMAccountName",
    ein_attribute: str = "employeeID",
    use_ssl: bool = False,
    use_tls: bool = True,
    ad_domain: Optional[str] = None
) -> Tuple[bool, Optional[dict], str]:
    """
    Authenticate a user against LDAP/AD.
    
    Flow:
    1. Bind with service account to search for the user
    2. Find the user's DN (searches by username, EIN, or email)
    3. Attempt to bind as the user with their password
    4. If bind succeeds → authenticated (password never stored)
    
    Returns: (success, user_info_dict, message)
    """
    try:
        server = _create_ldap_server(server_url, use_ssl, use_tls)

        # Step 1: Bind with service account
        admin_conn = Connection(
            server,
            user=bind_dn,
            password=bind_password,
            authentication=SIMPLE,
            auto_bind=True,
            raise_exceptions=True
        )

        # Step 2: Search for the user
        search_base = user_search_base or base_dn
        # Escape user input to prevent LDAP injection attacks
        safe_username = escape_filter_chars(username)
        search_filter = user_search_filter.replace("{username}", safe_username).replace("{ein}", safe_username)

        logger.info(f"LDAP search: base={search_base}, filter={search_filter}")

        # Request EIN attribute in addition to standard ones
        search_attrs = [email_attribute, username_attribute, ein_attribute, 'cn', 'distinguishedName']

        admin_conn.search(
            search_base,
            search_filter,
            attributes=search_attrs
        )

        if not admin_conn.entries:
            admin_conn.unbind()
            logger.warning(f"LDAP user not found: {username}")
            return False, None, "User not found in Active Directory"

        user_entry = admin_conn.entries[0]
        user_dn = str(user_entry.entry_dn)
        user_email = str(getattr(user_entry, email_attribute, '')) if hasattr(user_entry, email_attribute) else None
        user_cn = str(getattr(user_entry, 'cn', username))
        user_ein = str(getattr(user_entry, ein_attribute, '')) if hasattr(user_entry, ein_attribute) else None
        user_sam = str(getattr(user_entry, username_attribute, '')) if hasattr(user_entry, username_attribute) else None

        admin_conn.unbind()

        # Step 3: Attempt to bind as the user (this validates their password)
        # The password is sent over TLS to AD, verified by AD, and NEVER stored locally
        try:
            user_conn = Connection(
                server,
                user=user_dn,
                password=password,
                authentication=SIMPLE,
                auto_bind=True,
                raise_exceptions=True
            )
            user_conn.unbind()
        except LDAPBindError:
            logger.warning(f"LDAP authentication failed for user: {username} (wrong password)")
            return False, None, "Invalid password"

        # Step 4: Authentication successful — build user info
        # Determine email: from AD attribute, or construct from username@domain
        final_email = user_email
        if not final_email or final_email == '[]' or final_email == '':
            if ad_domain:
                final_email = f"{user_sam or username}@{ad_domain}"
            else:
                final_email = username

        user_info = {
            "username": user_sam or username,
            "email": final_email,
            "display_name": user_cn,
            "dn": user_dn,
            "ein": user_ein,
            "auth_type": "ldap"
        }

        logger.info(f"LDAP authentication successful for: {username} (email: {final_email})")
        return True, user_info, "Authentication successful"

    except LDAPBindError as e:
        logger.error(f"LDAP service account bind failed: {e}")
        return False, None, "LDAP service account authentication failed"

    except LDAPSocketOpenError as e:
        logger.error(f"Cannot connect to LDAP server: {e}")
        return False, None, f"Cannot connect to LDAP server"

    except LDAPException as e:
        logger.error(f"LDAP error during authentication: {e}")
        return False, None, f"LDAP error: {str(e)}"

    except Exception as e:
        logger.error(f"Unexpected error during LDAP auth: {type(e).__name__}: {e}")
        return False, None, f"Unexpected error during authentication"
