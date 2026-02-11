from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from mangum import Mangum
from app.routers import auth, folders, files
from app.database import engine, Base
from app.config import get_settings
from app.logger import logger

# Import all models so Base.metadata.create_all picks them up
import app.models  # noqa: F401 - ensures User, Folder, File, LdapConfig tables are created

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(title="Secure Serverless File Portal")

# Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

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
def debug_s3():
    """Debug endpoint to check S3 connectivity and AWS credentials"""
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

