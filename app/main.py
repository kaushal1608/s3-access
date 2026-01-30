from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from mangum import Mangum
from app.routers import auth, folders, files
from app.database import engine, Base
from app.config import get_settings
from app.logger import logger

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

handler = Mangum(app)

