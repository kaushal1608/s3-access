from pydantic import BaseModel, field_validator
from typing import Optional
import re

class UserBase(BaseModel):
    email: str  # Using str instead of EmailStr to allow .local domains

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Allow standard emails AND .local domain emails (e.g. admin@company.local)
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    """
    Login supports multiple modes:
    - Local login: email + password
    - LDAP login: identifier (EIN/Employee ID) + password
    """
    email: Optional[str] = None           # For local login
    password: str
    auth_method: Optional[str] = "local"  # "local" or "ldap"
    identifier: Optional[str] = None      # For LDAP: EIN / Employee ID / username
    ldap_username: Optional[str] = None   # Legacy: sAMAccountName (kept for compatibility)

    @field_validator('email', mode='before')
    @classmethod
    def normalize_email(cls, v):
        if v:
            return v.lower().strip()
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    role: str = "user"
    auth_type: str = "local"  # "local" or "ldap"

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    auth_type: str = "local"

    model_config = {"from_attributes": True}

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# LDAP Configuration schemas
class LdapConfigCreate(BaseModel):
    server_url: str
    base_dn: str
    user_search_base: Optional[str] = None
    bind_dn: str
    bind_password: str  # Plaintext here — encrypted before storage
    user_search_filter: str = "(&(objectClass=user)(sAMAccountName={username}))"
    ein_search_filter: str = "(&(objectClass=user)(employeeID={ein}))"  # Filter for EIN lookup
    email_attribute: str = "mail"
    username_attribute: str = "sAMAccountName"
    ein_attribute: str = "employeeID"  # AD attribute for Employee ID / EIN
    ad_domain: Optional[str] = None
    use_ssl: bool = False
    use_tls: bool = True
    is_enabled: bool = True

class LdapConfigResponse(BaseModel):
    id: int
    is_enabled: bool
    server_url: str
    base_dn: str
    user_search_base: Optional[str] = None
    bind_dn: str
    # bind_password is NEVER returned
    user_search_filter: str
    ein_search_filter: str = "(&(objectClass=user)(employeeID={ein}))"
    email_attribute: str
    username_attribute: str
    ein_attribute: str = "employeeID"
    ad_domain: Optional[str] = None
    use_ssl: bool
    use_tls: bool

    model_config = {"from_attributes": True}

class LdapConfigUpdate(BaseModel):
    server_url: Optional[str] = None
    base_dn: Optional[str] = None
    user_search_base: Optional[str] = None
    bind_dn: Optional[str] = None
    bind_password: Optional[str] = None  # Only sent when changing
    user_search_filter: Optional[str] = None
    ein_search_filter: Optional[str] = None
    email_attribute: Optional[str] = None
    username_attribute: Optional[str] = None
    ein_attribute: Optional[str] = None
    ad_domain: Optional[str] = None
    use_ssl: Optional[bool] = None
    use_tls: Optional[bool] = None
    is_enabled: Optional[bool] = None

class LdapTestRequest(BaseModel):
    server_url: str
    bind_dn: str
    bind_password: str
    base_dn: str
    use_ssl: bool = False
    use_tls: bool = True
