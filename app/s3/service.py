import boto3
import os
from botocore.exceptions import ClientError
from fastapi import HTTPException

from app.config import get_settings

settings = get_settings()

S3_BUCKET = settings.S3_BUCKET_NAME
AWS_REGION = settings.AWS_REGION

# If using VPC endpoint, ensure infrastructure routes traffic correctly.
# Boto3 by default uses standard endpoints unless configured or running inside VPC with Gateway Endpoint.
s3_client = boto3.client('s3', region_name=AWS_REGION)

from app.logger import logger

def generate_presigned_upload_url(s3_key: str, content_type: str = "application/octet-stream", expiration=300):
    try:
        response = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        logger.error(f"Error generating upload URL: {e}")
        raise HTTPException(status_code=500, detail="Could not generate upload URL")

def generate_presigned_download_url(s3_key: str, expiration=300):
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        logger.error(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail="Could not generate download URL")

def list_files(prefix: str):
    try:
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
        return response.get('Contents', [])
    except ClientError as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail="Could not list files from S3")

def delete_s3_object(s3_key: str):
    """Delete an object from S3"""
    try:
        s3_client.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        return True
    except ClientError as e:
        logger.error(f"Error deleting S3 object: {e}")
        raise HTTPException(status_code=500, detail="Could not delete file from S3")
