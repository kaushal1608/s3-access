# Walkthrough - Secure Serverless S3 File Portal

## Overview
This backend ensures secure file management using AWS Lambda, S3, and PostgreSQL. It enforces strict folder-based access control and uses presigned URLs for all file operations to keep the S3 bucket private.

## Architecture
- **Compute**: AWS Lambda (via Mangum & FastAPI)
- **Storage**: Amazon S3 (Private, accessed via VPC Endpoint)
- **Database**: PostgreSQL (RDS or compatible)
- **Auth**: JWT (OAuth2 flow)

## Deployment Steps

### 1. Database Setup
Ensure you have a PostgreSQL database running and accessible from your VPC.
Set the `DATABASE_URL` environment variable:
`postgresql://user:password@host:port/dbname`

### 2. S3 Bucket
Create a private S3 bucket.
Update the `iam_policy.json` with your bucket name.

### 3. Deploy Lambda
Zip the package (including dependencies):
```bash
pip install -r requirements.txt -t .
zip -r lambda_function.zip .
```

Create the Lambda function using the `iam_policy.json` role.
**Environment Variables**:
- `DATABASE_URL`: Connection string
- `SECRET_KEY`: Random secret string
- `S3_BUCKET_NAME`: Your bucket name
- `AWS_REGION`: e.g., us-east-1

### 4. API Gateway
Create an HTTP API in API Gateway and point it to the Lambda function.

## Verification Scenarios

### 1. User Registration
**POST** `/auth/register`
```json
{
  "email": "user@example.com",
  "password": "strongpassword"
}
```
**Expected**: 200 OK with user details.

### 2. Login
**POST** `/auth/login`
```json
{
  "email": "user@example.com",
  "password": "strongpassword"
}
```
**Expected**: Returns `access_token`.

### 3. Create Folder
**POST** `/folders` (Auth required)
```json
{
  "name": "My Documents"
}
```
**Expected**: Returns folder ID and owner ID.

### 4. Upload File
**POST** `/files/upload/{folder_id}`
```json
{
  "filename": "report.pdf"
}
```
**Expected**: Returns `upload_url` (Presigned S3 URL).
**Action**: Use this URL to PUT the file content.

### 5. Download File
**GET** `/files/download/{file_id}`
**Expected**: Returns `download_url`.
