from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str
    auth_method: Optional[str] = "local"  # "local" or "ldap"
    ldap_username: Optional[str] = None   # For LDAP: the sAMAccountName / AD username

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    role: str = "user"
    auth_type: str = "local"  # "local" or "ldap"

class UserResponse(UserBase):
    id: int
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
    email_attribute: str = "mail"
    username_attribute: str = "sAMAccountName"
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
    email_attribute: str
    username_attribute: str
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
    email_attribute: Optional[str] = None
    username_attribute: Optional[str] = None
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
