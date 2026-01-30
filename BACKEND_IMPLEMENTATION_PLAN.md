# 🛠️ Backend Implementation Plan

This document translates the architectural vision (`ARCHITECTURE.md`) and development standards (`backend-dev-guidelines`) into actionable tasks for the backend development team.

**Note**: The guidelines reference Node.js/TypeScript patterns. This plan adapts those principles to our **Python/FastAPI** stack.

---

## 1. Core Refactoring Principles

We are moving towards a **Strict Layered Architecture** to improve testability and maintainability.

**Current State:**
`Router (FastAPI) → Database Session (SQLAlchemy)`

**Target State:**
`Router (Controller) → Service Layer (Business Logic) → Repository/CRUD Layer → Database`

### 🔹 Layer Responsibilities
1.  **Routers (`app/routers/`)**:
    -   Validate input (Pydantic usage is good).
    -   Parse headers/auth.
    -   **Call Service methods**.
    -   Return HTTP responses.
    -   *No business logic allowed here.*
2.  **Services (`app/services/`)**:
    -   Contain all business rules (e.g., "User cannot share folder they don't own").
    -   Framework-agnostic (don't return `HTTPException` here if possible; raise custom errors).
    -   Call Repositories.
3.  **Repositories (`app/crud/` or `app/repositories/`)**:
    -   Handle all SQL/ORM interactions.
    -   Pure data access.

---

## 2. Actionable Tasks

### ✅ Task 1: Centralize Configuration
**Priority**: High
**Goal**: Remove scattered `os.getenv` calls.
**Action**:
-   Create `app/config.py` using Pydantic's `BaseSettings`.
-   Define all env vars: `DATABASE_URL`, `SECRET_KEY`, `S3_BUCKET_NAME`, `AWS_REGION`.
-   Update `app/main.py`, `app/database.py`, and `app/s3/service.py` to import from `app/config.py`.

### ✅ Task 2: Implement logging using AWS Lambda Powertools
**Priority**: High
**Goal**: Structured JSON logging for CloudWatch.
**Action**:
-   Add `aws-lambda-powertools` to `requirements.txt`.
-   Configure the `Logger` in `app/main.py`.
-   Replace `print()` statements with `logger.info()` / `logger.error()`.
-   Ensure `correlation_id` is propagated.

### ✅ Task 3: Refactor "Auth" Module
**Priority**: Medium
**Goal**: Separate logic from `app/routers/auth.py`.
**Action**:
-   Create `app/services/auth_service.py`.
    -   Move `register_user` logic here.
    -   Move `authenticate_user` logic here.
-   Create `app/crud/user_repository.py`.
    -   Move `db.query(User)...` calls here.
-   Update `app/routers/auth.py` to inject `AuthService`.

### ✅ Task 4: Refactor "Folders" Module
**Priority**: Medium
**Goal**: Isolate folder permission logic.
**Action**:
-   Create `app/services/folder_service.py`.
    -   Methods: `create_folder`, `get_folders_for_user`, `share_folder`.
    -   **Critical**: Ensure permission checks (Ownership) happen in the Service, not the Router.
-   Update `app/routers/folders.py` to genericize calls.

### ✅ Task 5: Testing Infrastructure
**Priority**: Low (but critical for BFRI > 3)
**Goal**: Enable Unit Testing.
**Action**:
-   Install `pytest`.
-   Create `tests/conftest.py` with specific fixtures for a **test database** (SQLite in-memory or Docker Postgres).
-   Write unit tests for `AuthService` (mocking the repository).

---

## 3. Developer Checklist (Definition of Done)

Before merging any PR, verify:

- [ ] **BFRI Check**: Is the logic testable? Are risks mitigated?
- [ ] **Layer Violation Check**: Did you put SQL queries in the Router? (Don't).
- [ ] **Config**: Are you using `app.config` instead of `os.getenv`?
- [ ] **Observability**: Are errors logged via `logger.exception`?
- [ ] **Validation**: Are Pydantic models strict?

---

## 4. Reference Map

| Guideline Pattern (Node.js) | Implementation (Python/FastAPI) |
| --------------------------- | ------------------------------- |
| `BaseController` | `APIRouter` + Dependency Injection |
| `unifiedConfig` | `pydantic_settings.BaseSettings` |
| `Zod` | `Pydantic` |
| `Prisma` | `SQLAlchemy` |
| `Jest` | `pytest` |

---
