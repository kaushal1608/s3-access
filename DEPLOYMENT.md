# Deployment Guide - Secure Serverless S3 File Portal

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **AWS SAM CLI** installed ([Install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
3. **Python 3.10+** installed
4. **PostgreSQL** database (AWS RDS recommended)
5. **VPC** with:
   - Private subnets
   - S3 Gateway Endpoint
   - NAT Gateway (for Lambda to access RDS)

---

## Step 1: VPC Setup (If not already done)

### Create S3 VPC Gateway Endpoint

```bash
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-XXXXXXXXX \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids rtb-XXXXXXXXX \
    --vpc-endpoint-type Gateway
```

**Note**: Replace `vpc-XXXXXXXXX` and `rtb-XXXXXXXXX` with your VPC and route table IDs.

---

## Step 2: Database Setup

### Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
    --db-instance-identifier file-portal-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username admin \
    --master-user-password YOUR_STRONG_PASSWORD \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-XXXXXXXXX \
    --db-subnet-group-name your-db-subnet-group \
    --no-publicly-accessible
```

### Get the Database Endpoint

```bash
aws rds describe-db-instances \
    --db-instance-identifier file-portal-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text
```

---

## Step 3: Build and Deploy

### Option A: SAM CLI Deployment (Recommended)

```bash
cd d:\Anti\s3_access

# Build the application
sam build

# Deploy (first time - guided)
sam deploy --guided
```

When prompted, provide:
- **Stack Name**: `secure-file-portal`
- **AWS Region**: `us-east-1` (or your preferred region)
- **DatabaseUrl**: `postgresql://admin:PASSWORD@your-rds-endpoint:5432/postgres`
- **SecretKey**: Generate a random 32+ character string
- **S3BucketName**: `your-unique-bucket-name`
- **VpcId**: Your VPC ID
- **SubnetIds**: Your private subnet IDs (comma-separated)
- **SecurityGroupId**: Security group that allows egress to RDS and S3

### Option B: Manual ZIP Deployment

```bash
# Create deployment package
pip install -r requirements.txt -t ./package
cd package
zip -r ../deployment.zip .
cd ..
zip -g deployment.zip -r app

# Create Lambda function
aws lambda create-function \
    --function-name SecureFilePortal \
    --runtime python3.10 \
    --handler app.main.handler \
    --zip-file fileb://deployment.zip \
    --role arn:aws:iam::ACCOUNT_ID:role/LambdaS3AccessRole \
    --vpc-config SubnetIds=subnet-XXX,subnet-YYY,SecurityGroupIds=sg-XXX \
    --environment "Variables={DATABASE_URL=postgresql://...,SECRET_KEY=...,S3_BUCKET_NAME=...}"
```

---

## Step 4: Apply S3 Bucket Policy

After deployment, apply the VPC endpoint restriction:

1. Edit `s3_bucket_policy.json`:
   - Replace `YOUR_BUCKET_NAME` with your actual bucket name
   - Replace `vpce-XXXXXXXXX` with your S3 VPC endpoint ID
   - Replace `YOUR_ACCOUNT_ID` with your AWS account ID

2. Apply the policy:

```bash
aws s3api put-bucket-policy \
    --bucket YOUR_BUCKET_NAME \
    --policy file://s3_bucket_policy.json
```

---

## Step 5: Verify Deployment

### Test the API

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name secure-file-portal \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

# Test root endpoint
curl $API_URL

# Register a user
curl -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "securepassword123"}'

# Login
curl -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "securepassword123"}'
```

---

## Security Checklist

- [x] S3 bucket is private (block public access enabled)
- [x] S3 bucket accessible only via VPC endpoint
- [x] Lambda runs inside VPC
- [x] No AWS access keys in code
- [x] IAM role uses least privilege
- [x] Passwords hashed with bcrypt
- [x] JWT tokens with expiration
- [x] Database credentials stored as environment variables
- [x] HTTPS only (API Gateway default)

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing key (32+ chars) | `your-super-secret-random-key-here` |
| `S3_BUCKET_NAME` | S3 bucket name | `my-secure-file-portal-bucket` |
| `AWS_REGION` | AWS region | `us-east-1` |

---

## Troubleshooting

### Lambda can't connect to RDS
- Ensure Lambda security group allows outbound to RDS port (5432)
- Ensure RDS security group allows inbound from Lambda security group

### Lambda can't access S3
- Verify the S3 VPC endpoint is in the same VPC as Lambda
- Check the route table includes the S3 endpoint

### Pre-signed URLs not working
- The Lambda IAM role must have `s3:GetObject` and `s3:PutObject` permissions
- Bucket policy must allow the Lambda role
