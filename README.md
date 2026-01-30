# 🔐 Secure Serverless S3 File Portal

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange.svg)](https://aws.amazon.com/lambda/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **production-grade**, **enterprise-ready** serverless backend for secure multi-user file management with Amazon S3. Built with FastAPI, deployed on AWS Lambda, featuring JWT authentication, folder-based access control, and VPC-restricted S3 access.

---

## 🌟 Features

### 🔒 Security First
- **Zero Access Keys in Code** - Uses IAM roles exclusively
- **VPC Endpoint Only** - S3 bucket locked to private VPC access
- **Pre-signed URLs** - Secure, time-limited file operations
- **bcrypt Password Hashing** - Industry-standard password security
- **JWT Authentication** - Stateless, secure token-based auth

### 👥 Multi-User Access Control
- **Owner/User Role Model** - Granular permission system
- **Folder-Based Permissions** - Each folder has one owner
- **Shareable Folders** - Owners can grant download access to others
- **Prefix-Isolated Storage** - User data segregated at S3 level

### ⚡ Serverless Architecture
- **AWS Lambda** - Pay-per-request, auto-scaling
- **API Gateway HTTP API** - Low-latency, cost-effective
- **PostgreSQL (RDS)** - Managed, reliable database
- **Mangum Adapter** - Seamless ASGI-to-Lambda bridge

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (HTTP API)                        │
│                    ───────────────────────                       │
│              JWT Token Validation at App Layer                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Lambda                                │
│                    ─────────────────                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FastAPI + Mangum                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │   │
│  │  │  Auth   │  │ Folders │  │  Files  │  │  S3 Service │  │   │
│  │  │ Router  │  │ Router  │  │ Router  │  │  (boto3)    │  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                        VPC (Private)                             │
└──────────────────────────────┼──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │   S3 Bucket     │  │  VPC Endpoint   │
│     (RDS)       │  │   (Private)     │◄─│    (Gateway)    │
│                 │  │                 │  │                 │
│  • users        │  │  • {user_id}/   │  │ Restricts S3    │
│  • folders      │  │    {folder}/    │  │ to VPC only     │
│  • folder_access│  │      files...   │  │                 │
│  • files        │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 📁 Project Structure

```
s3-access/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app + Mangum handler
│   ├── database.py             # SQLAlchemy configuration
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── dependencies.py     # get_current_user dependency
│   │   └── jwt_handler.py      # JWT creation & validation
│   ├── models/
│   │   ├── __init__.py
│   │   ├── users.py            # User model (owner/user roles)
│   │   ├── folders.py          # Folder & FolderAccess models
│   │   └── files.py            # File metadata model
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # /auth/register, /auth/login
│   │   ├── folders.py          # /folders CRUD + sharing
│   │   └── files.py            # /upload, /download endpoints
│   ├── s3/
│   │   ├── __init__.py
│   │   └── service.py          # Pre-signed URL generation
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py             # Auth request/response models
│   │   ├── folder.py           # Folder schemas
│   │   └── file.py             # File schemas
│   ├── services/               # Business logic (extensible)
│   └── utils/                  # Utility functions
├── template.yaml               # AWS SAM deployment template
├── iam_policy.json             # Lambda execution role policy
├── s3_bucket_policy.json       # S3 VPC endpoint restriction
├── requirements.txt            # Python dependencies
├── DEPLOYMENT.md               # Detailed deployment guide
├── .env.example                # Environment variable template
└── .gitignore
```

---

## 🚀 Installation & Deployment

### 1️⃣ Local Development (Windows)

The easiest way to run the project locally on Windows is using the included Python script.

**Prerequisites:**
- Python 3.10+ installed
- Git installed

**Steps:**
```powershell
# 1. Clone the repository
git clone https://github.com/kaushal1608/s3-access.git
cd s3-access

# 2. Run the automated setup script
python run_local.py
```
This script will automatically:
- Create a virtual environment (`venv`)
- Install all dependencies from `requirements.txt`
- Set up a local SQLite database
- Start the server at `http://localhost:8000`

---

### 2️⃣ Linux VM / Server Deployment

For deploying on a Linux VM (e.g., Ubuntu, EC2), use the shell script for a quick setup.

**Prerequisites:**
- Python 3.10+ (`sudo apt install python3 python3-venv`)
- Git

**Steps:**
```bash
# 1. Clone the repository
git clone https://github.com/kaushal1608/s3-access.git
cd s3-access

# 2. Make the script executable and run it
chmod +x run_local.sh
./run_local.sh
```
The application will be accessible at `http://YOUR_SERVER_IP:8000`. 
*Note: Make sure port 8000 is open in your firewall/security group.*

---

### 3️⃣ AWS Lambda Deployment (Serverless)

This is the production-grade deployment using AWS SAM.

**Prerequisites:**
- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed
- Docker (optional, for local testing)

**Steps:**
```bash
# 1. Build the application
sam build

# 2. Deploy to AWS (guided process)
sam deploy --guided
```

**During the guided deploy:**
- **Stack Name**: `s3-access-portal`
- **AWS Region**: `us-east-1` (or your preferred region)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Save arguments to configuration file**: `Y`

For a detailed deep-dive into the AWS architecture and manual deployment steps, please refer to [DEPLOYMENT.md](./DEPLOYMENT.md).

### Access Points

| URL | Description |
|-----|-------------|
| http://localhost:8000 | API Root |
| http://localhost:8000/docs | Swagger UI (Interactive API Docs) |
| http://localhost:8000/frontend/index.html | Web Frontend |

---


## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Register new user | ❌ |
| `POST` | `/auth/login` | Login, get JWT token | ❌ |

### Folders

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/folders` | List accessible folders | ✅ |
| `POST` | `/folders` | Create new folder | ✅ |
| `POST` | `/folders/share` | Share folder with user | ✅ (Owner only) |

### Files

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/upload/{folder_id}` | Get pre-signed upload URL | ✅ (Owner only) |
| `GET` | `/download/{file_id}` | Get pre-signed download URL | ✅ |
| `GET` | `/folders/{folder_id}/files` | List files in folder | ✅ |

---

## 🔑 Authentication Flow

```
┌──────────────┐     POST /auth/register      ┌──────────────┐
│    Client    │ ──────────────────────────► │     API      │
│              │     { email, password }      │              │
│              │ ◄────────────────────────── │              │
│              │     { id, email, role }      │              │
└──────────────┘                              └──────────────┘

┌──────────────┐     POST /auth/login         ┌──────────────┐
│    Client    │ ──────────────────────────► │     API      │
│              │     { email, password }      │              │
│              │ ◄────────────────────────── │              │
│              │     { access_token }         │              │
└──────────────┘                              └──────────────┘

┌──────────────┐     GET /folders             ┌──────────────┐
│    Client    │ ──────────────────────────► │     API      │
│              │  Authorization: Bearer JWT   │              │
│              │ ◄────────────────────────── │              │
│              │     [ folders... ]           │              │
└──────────────┘                              └──────────────┘
```

---



## 🔒 Security Configuration

### IAM Role Policy (Least Privilege)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET",
                "arn:aws:s3:::YOUR_BUCKET/*"
            ]
        }
    ]
}
```

### S3 Bucket Policy (VPC Endpoint Only)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": ["arn:aws:s3:::YOUR_BUCKET/*"],
            "Condition": {
                "StringNotEquals": {
                    "aws:sourceVpce": "vpce-XXXXXXXXX"
                }
            }
        }
    ]
}
```

---

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Folders table
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    s3_prefix VARCHAR UNIQUE NOT NULL,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Folder access (sharing)
CREATE TABLE folder_access (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES folders(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- File metadata
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    s3_key VARCHAR UNIQUE NOT NULL,
    size BIGINT NOT NULL,
    content_type VARCHAR,
    folder_id INTEGER REFERENCES folders(id),
    uploaded_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Testing

### Using cURL

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "securepassword"}'

# Login
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "securepassword"}' \
  | jq -r '.access_token')

# Create folder
curl -X POST http://localhost:8000/folders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Documents"}'

# Get upload URL
curl -X POST http://localhost:8000/upload/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "report.pdf"}'
```

---

## 📊 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `SECRET_KEY` | JWT signing key (32+ chars) | ✅ | - |
| `S3_BUCKET_NAME` | S3 bucket for file storage | ✅ | - |
| `AWS_REGION` | AWS region | ❌ | `ap-south-1` |

---

## 🛡️ Security Checklist

- [x] No AWS access keys in code
- [x] S3 bucket is private (block public access)
- [x] S3 accessible only via VPC endpoint
- [x] Lambda runs inside VPC
- [x] Passwords hashed with bcrypt
- [x] JWT tokens with expiration
- [x] IAM role uses least privilege
- [x] HTTPS only (API Gateway default)
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] Input validation (Pydantic)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Kaushal** - [GitHub](https://github.com/kaushal1608)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

<p align="center">
  <b>Built with ❤️ using FastAPI, AWS Lambda, and Python</b>
</p>
