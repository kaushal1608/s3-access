from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

# Expecting DATABASE_URL to be set in environment variables
# Format: postgresql://user:password@host:port/dbname
settings = get_settings()
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# SQLite requires check_same_thread=False for FastAPI
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Production PostgreSQL: tuned connection pool settings
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,           # Base number of persistent connections
        max_overflow=20,        # Allow up to 30 total connections under load
        pool_pre_ping=True,     # Verify connections are alive before use
        pool_recycle=300        # Recycle stale connections every 5 minutes
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# CR-10: Use modern DeclarativeBase instead of deprecated declarative_base()
class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
