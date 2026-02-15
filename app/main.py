import uuid
from pathlib import Path
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from mangum import Mangum
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import auth, folders, files
from app.database import engine, Base
from app.config import get_settings
from app.logger import logger
from app.auth.dependencies import get_admin_user

# Import all models so Base.metadata.create_all picks them up
import app.models  # noqa: F401 - ensures User, Folder, File, LdapConfig tables are created

def run_migrations():
    """
    Run database migrations for existing databases.
    SQLAlchemy's create_all only creates NEW tables — it won't add columns
    to existing tables. This function handles schema upgrades.
    """
    from sqlalchemy import text, inspect
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # Migration 1: Add 'auth_type' column to users table
        if 'users' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('users')]
            if 'auth_type' not in columns:
                logger.info("Migration: Adding 'auth_type' column to users table")
                conn.execute(text("ALTER TABLE users ADD COLUMN auth_type VARCHAR DEFAULT 'local'"))
                conn.commit()
                logger.info("Migration: 'auth_type' column added successfully")
        
        # Migration 2: Add EIN columns to ldap_config table
        if 'ldap_config' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('ldap_config')]
            if 'ein_search_filter' not in columns:
                logger.info("Migration: Adding 'ein_search_filter' column to ldap_config table")
                conn.execute(text("ALTER TABLE ldap_config ADD COLUMN ein_search_filter VARCHAR DEFAULT '(&(objectClass=user)(employeeID={ein}))'"))
                conn.commit()
            if 'ein_attribute' not in columns:
                logger.info("Migration: Adding 'ein_attribute' column to ldap_config table")
                conn.execute(text("ALTER TABLE ldap_config ADD COLUMN ein_attribute VARCHAR DEFAULT 'employeeID'"))
                conn.commit()
                logger.info("Migration: EIN columns added successfully")
            
            # Migration 3: Add TLS validation columns (CR-01)
            if 'validate_cert' not in columns:
                logger.info("Migration: Adding 'validate_cert' column to ldap_config table")
                conn.execute(text("ALTER TABLE ldap_config ADD COLUMN validate_cert BOOLEAN DEFAULT 0"))
                conn.commit()
            if 'ca_cert_path' not in columns:
                logger.info("Migration: Adding 'ca_cert_path' column to ldap_config table")
                conn.execute(text("ALTER TABLE ldap_config ADD COLUMN ca_cert_path VARCHAR"))
                conn.commit()
                logger.info("Migration: TLS validation columns added successfully")
        
        # Migration 4: Add upload_status to files table (CR-04)
        if 'files' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('files')]
            if 'upload_status' not in columns:
                logger.info("Migration: Adding 'upload_status' column to files table")
                conn.execute(text("ALTER TABLE files ADD COLUMN upload_status VARCHAR DEFAULT 'completed'"))
                conn.commit()
                logger.info("Migration: 'upload_status' column added successfully")
        
        # Final: create_all for any brand new tables (e.g. ldap_config)
        Base.metadata.create_all(bind=engine)
        logger.info("Database migrations complete")

run_migrations()

settings = get_settings()

# Warn if SECRET_KEY is weak or default
if "dev-secret" in settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
    logger.warning(
        "SECRET_KEY appears to be a default or is too short (<32 chars). "
        "Generate a strong random key for production: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )

app = FastAPI(title="Secure Serverless File Portal")

# --- CR-02: Rate Limiting Setup ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CR-11: Request Correlation ID + Logging Middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] {request.method} {request.url.path}")
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(f"[{request_id}] Response: {response.status_code}")
    return response

# --- CR-21: Security Headers Middleware ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# --- CR-06: CSRF Protection Documentation ---
# CSRF Protection: We use Bearer tokens in Authorization header (not cookies),
# so CSRF attacks cannot replay credentials. If we ever switch to cookie-based auth,
# we MUST add CSRF middleware (e.g., starlette-csrf).

# CORS Configuration - Allow frontend to communicate with backend
cors_origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(files.router)

# Serve frontend static files (for local development)
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/frontend", StaticFiles(directory=str(frontend_path), html=True), name="frontend")

@app.get("/")
def root():
    return {
        "message": "Welcome to the Secure Serverless File Portal",
        "docs": "/docs",
        "frontend": "/frontend/index.html"
    }

@app.get("/debug/s3")
def debug_s3(admin_user=Depends(get_admin_user)):
    """Debug endpoint to check S3 connectivity and AWS credentials (admin only)"""
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    
    result = {
        "bucket_name": settings.S3_BUCKET_NAME,
        "region": settings.AWS_REGION,
        "credentials_configured": False,
        "bucket_accessible": False,
        "error": None
    }
    
    try:
        # Check credentials
        sts = boto3.client('sts', region_name=settings.AWS_REGION)
        identity = sts.get_caller_identity()
        result["credentials_configured"] = True
        result["aws_account"] = identity["Account"]
        result["aws_arn"] = identity["Arn"]
        
        # Check bucket access
        s3 = boto3.client('s3', region_name=settings.AWS_REGION)
        s3.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        result["bucket_accessible"] = True
        
        # Try to list objects (to verify read permissions)
        response = s3.list_objects_v2(Bucket=settings.S3_BUCKET_NAME, MaxKeys=1)
        result["can_list_objects"] = True
        
    except NoCredentialsError:
        result["error"] = "AWS credentials not found. Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables, or attach an IAM role to the EC2 instance."
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        result["error"] = f"{error_code}: {error_msg}"
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
    
    return result

handler = Mangum(app)
