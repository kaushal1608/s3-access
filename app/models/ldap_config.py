from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database import Base


class LdapConfig(Base):
    """
    Stores LDAP/AD configuration. Only one active config at a time.
    Passwords for LDAP connection (bind_password) are stored encrypted.
    No user AD passwords are ever stored.
    """
    __tablename__ = "ldap_config"

    id = Column(Integer, primary_key=True, index=True)
    is_enabled = Column(Boolean, default=False, nullable=False)

    # LDAP Server Settings
    server_url = Column(String, nullable=False)        # e.g. ldap://dc01.company.local or ldaps://dc01.company.local
    base_dn = Column(String, nullable=False)            # e.g. DC=company,DC=local
    user_search_base = Column(String, nullable=True)    # e.g. OU=Users,DC=company,DC=local (defaults to base_dn)

    # Bind credentials for searching users (service account)
    bind_dn = Column(String, nullable=False)            # e.g. CN=svc_ldap,OU=ServiceAccounts,DC=company,DC=local
    bind_password_encrypted = Column(String, nullable=False)  # Encrypted bind password (never plaintext)

    # Search filter to find users by username
    user_search_filter = Column(String, default="(&(objectClass=user)(sAMAccountName={username}))")

    # Search filter to find users by EIN/Employee ID
    ein_search_filter = Column(String, default="(&(objectClass=user)(employeeID={ein}))")

    # Attribute mapping
    email_attribute = Column(String, default="mail")
    username_attribute = Column(String, default="sAMAccountName")
    ein_attribute = Column(String, default="employeeID")  # AD attribute for Employee ID / EIN

    # AD Domain (e.g., company.local) — users from this domain get admin role
    ad_domain = Column(String, nullable=True)           # e.g. company.local

    # Use SSL/TLS
    use_ssl = Column(Boolean, default=False)
    use_tls = Column(Boolean, default=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
