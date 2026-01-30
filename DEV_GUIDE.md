# 📘 Developer & Architecture Guide

This document assists frontend and backend developers in maintaining, optimizing, and extending the S3 Secure File Portal.

---

## 🎨 Frontend Development Guide

### 1. Design System: Glassmorphism Dark
We have implemented a premium **Glassmorphism Dark** theme (`frontend/styles.css`).
- **Background**: Deep Navy (`#0f172a`) with animated orbs.
- **Glass Cards**: `backdrop-filter: blur(16px)` with semi-transparent backgrounds.
- **Primary Color**: Electric Blue (`#3b82f6`) for main actions.
- **Accent Color**: Violet (`#8b5cf6`) for gradients and highlights.

**Key Components:**
- **Modals**: Center-screen glass cards. Use `openModal(element)` and `closeModal(element)` in `app.js`.
- **Toast Notifications**: Automatic stacking alerts for success/error messages.
- **Responsive Sidebar**: Collapses on mobile, toggles with hamburger menu.

### 2. New Features Implemented
- **Profile View**: A new **User Profile Modal** has been added. It is triggered by clicking the user avatar/email in the sidebar footer. It displays the user's email and unique ID.
- **Mobile Menu**: Fixed logic for toggling sidebar on small screens.

### 3. State Management (`app.js`)
- **`state` object**: Holds `user` (id, email), `token`, `folders`, and `files`.
- **`localStorage`**: Persists token and simple user info.
- **API Handling**: Centralized `apiRequest` function handles auth headers and JSON parsing.

### 4. Future Frontend Improvements
- **File Previews**: Implement a modal to preview images/PDFs directly using the pre-signed download URL instead of just downloading.
- **Settings Page**: Expand the Profile Modal into a full Settings page allows password changes.
- **Drag & Drop**: Enhance the upload modal with a visual drag-and-drop zone (partially implemented).

---

## ⚙️ Backend Development Guide

### 1. Architecture: Serverless FastAPI
- **Handler**: `app.main.handler` uses `Mangum` to adapt ASGI for AWS Lambda.
- **Database**: PostgreSQL (RDS) or SQLite (Local). Uses `SQLAlchemy` sessions.
- **Security**: JWT Auth (HS256), bcrypt hashing, S3 Presigned URLs.

### 2. Code Review & Optimization Notes
- **Pagination**: We have implemented `skip/limit` pagination on `GET /folders` and `GET /folders/{id}/files` to handle large datasets efficiently.
- **Async/Sync**: Route handlers are standard `def` (synchronous) because `psycopg2` and `boto3` are synchronous libraries. **Do not change to `async def`** unless you switch to `asyncpg` and `aioboto3`, otherwise you will block the event loop.
- **Security**: 
  - Ensure `SECRET_KEY` is set in production environment variables.
  - S3 Bucket Policy restricts access to VPC Endpoint only (critical for security).

### 3. Data Model
- **Users**: Roles (`user`, `admin`), hashed passwords.
- **Folders**: Owned by users, unique S3 prefixes (`{user_id}/{uuid}/`).
- **Files**: Metadata pointers to S3 keys. S3 Keys are: `{folder_prefix}{uuid}-{filename}`.

### 4. Required Fixes / TODOs
- **Secret Key**: Currently defaults to a hardcoded string if env var missing. Enforce env var check in startup.
- **Dependencies**: Periodically update `requirements.txt` for security patches.

---

## 🚀 Deployment Workflows

- **Local Windows**: `python run_local.py`
- **Local Linux**: `./run_local.sh`
- **AWS Production**: `sam build && sam deploy --guided`

Refers to `README.md` for detailed step-by-step installation instructions.
