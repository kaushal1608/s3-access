# 🛡️ Backend Security & Reliability Report

**Date:** 2026-02-11
**Priority:** High
**Status:** Action Required

This report outlines critical security vulnerabilities, production risks, and code quality issues identified in the backend services. Please address these items in priority order.

## 🔴 CRITICAL PRIORITIES (Immediate Fix Required)

### 1. 🔓 Information Disclosure (Critical)
**File:** `app/main.py` (lines ~91-131)
**Issue:** The `/debug/s3` endpoint is publicly accessible and leaks:
- AWS Account ID
- IAM Role ARN
- S3 Bucket Name
- Permission status

**Action:**
- [ ] Remove the endpoint entirely OR
- [ ] Protect it with `Depends(get_admin_user)`

### 2. 💉 LDAP Injection Vulnerability (Critical)
**File:** `app/services/ldap_service.py`
**Issue:** User input is inserted directly into LDAP search filters using `.replace()`.
```python
# VULNERABLE:
search_filter = user_search_filter.replace("{username}", username)
```
**Action:**
- [ ] Use `ldap3.utils.conv.escape_filter_chars` to sanitize `username` and `ldap_identifier` before replacement.

### 3. 🔑 Weak Default Secret Key (High)
**File:** `app/config.py` / `.env`
**Issue:** The default `SECRET_KEY` is weak and exposed in the codebase.
**Action:**
- [ ] Add a startup check in `main.py` or `config.py` that warns or fails if the secret key contains "dev-secret" or is too short (< 32 chars).

---

## 🟠 HIGH PRIORITIES (Production Risks)

### 4. 🛑 CORS Misconfiguration
**File:** `app/main.py`
**Issue:** `CORS_ORIGINS` defaults to `*` (wildcard), allowing any site to make authenticated requests.
**Action:**
- [ ] Change default to strict list (e.g., `["http://localhost:8000"]`).
- [ ] Ensure production deployment overrides this with the actual frontend domain.

### 5. 📉 No Rate Limiting
**File:** `app/routers/auth.py`
**Issue:** Login and registration endpoints can be brute-forced.
**Action:**
- [ ] Implement `slowapi` or similar to limit `/auth/login` to ~5-10 attempts per minute per IP.

### 6. 🗑️ S3 Orphaned Data
**Files:** `app/routers/files.py`, `app/routers/folders.py`
**Issue:**
- File deletion swallows S3 errors (silent failure).
- Folder deletion removes DB records but **leaves files in S3**.
**Action:**
- [ ] Update folder deletion to list and delete all S3 objects in the prefix *before* deleting the DB record.
- [ ] Log S3 deletion errors properly instead of printing.

---

## 🟡 MEDIUM PRIORITIES (Code Quality)

### 7. 🔒 TLS Validation Disabled
**File:** `app/services/ldap_service.py`
**Issue:** `ssl.CERT_NONE` makes LDAP vulnerable to MITM.
**Action:**
- [ ] Add `validate_cert` boolean to `LdapConfig`.
- [ ] Allow configuring CA path.

### 8. 🕒 Deprecated DateTime
**Files:** Multiple
**Issue:** `datetime.utcnow()` is deprecated.
**Action:**
- [ ] Replace with `datetime.now(timezone.utc)`.

### 9. 📦 Dependency Bloat
**File:** `app/logger.py`
**Issue:** Hard dependency on `aws_lambda_powertools` breaks local/VM execution if not installed.
**Action:**
- [ ] efficient fallback to standard `logging` if powertools is missing.

### 10. 📝 Input Sanitization
**File:** `app/routers/folders.py`
**Issue:** Folder names are not validated (length, regex).
**Action:**
- [ ] Add `pydantic` validator for `FolderCreate` (e.g., regex `^[a-zA-Z0-9 _-]{1,50}$`).
