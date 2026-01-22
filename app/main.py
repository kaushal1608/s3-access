from fastapi import FastAPI
from mangum import Mangum
from app.routers import auth, folders, files
from app.database import engine, Base

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Secure Serverless File Portal")

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(files.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Secure Serverless File Portal"}

handler = Mangum(app)
