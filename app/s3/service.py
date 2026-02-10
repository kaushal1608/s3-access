import boto3
import os
from botocore.exceptions import ClientError, NoCredentialsError, PartialCredentialsError
from fastapi import HTTPException

from app.config import get_settings

settings = get_settings()

S3_BUCKET = settings.S3_BUCKET_NAME
AWS_REGION = settings.AWS_REGION

from app.logger import logger

# Log configuration at startup
logger.info(f"S3 Configuration: bucket={S3_BUCKET}, region={AWS_REGION}")

# Lazy-initialized S3 client — retries if credentials weren't available at startup
_s3_client = None
_s3_init_attempted = False


def get_s3_client():
    """
    Lazy S3 client initialization. Retries on every call if previous attempt failed.
    This handles cases where:
    - IAM role metadata isn't available immediately at startup
    - Environment variables are set after the module is imported
    - Temporary credential issues resolve themselves
    """
    global _s3_client, _s3_init_attempted

    if _s3_client is not None:
        return _s3_client

    try:
        logger.info("Initializing S3 client...")
        client = boto3.client('s3', region_name=AWS_REGION)

        # Test credentials by getting caller identity
        sts = boto3.client('sts', region_name=AWS_REGION)
        identity = sts.get_caller_identity()
        logger.info(f"AWS credentials configured. Account: {identity['Account']}, ARN: {identity['Arn']}")

        _s3_client = client
        return _s3_client
    except NoCredentialsError:
        logger.error("AWS credentials not found! Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY or use IAM role")
        raise HTTPException(status_code=500, detail="S3 not configured: AWS credentials missing. Check server logs.")
    except PartialCredentialsError as e:
        logger.error(f"Incomplete AWS credentials: {e}")
        raise HTTPException(status_code=500, detail=f"S3 not configured: Incomplete credentials. {e}")
    except Exception as e:
        logger.error(f"Error initializing AWS client: {e}")
        raise HTTPException(status_code=500, detail=f"S3 not configured: {type(e).__name__}: {str(e)}")


# Try to initialize eagerly (best-effort, won't break the app if it fails)
try:
    get_s3_client()
except Exception:
    logger.warning("S3 client not available at startup - will retry on first request")


def generate_presigned_upload_url(s3_key: str, content_type: str = "application/octet-stream", expiration=300):
    client = get_s3_client()

    try:
        logger.info(f"Generating presigned upload URL for bucket: {S3_BUCKET}, key: {s3_key}, content_type: {content_type}")

        # IMPORTANT: Do NOT include ContentType in Params.
        # When ContentType is in Params, S3 adds 'content-type' to X-Amz-SignedHeaders
        # and enforces that the exact same Content-Type is sent during upload.
        # If there's any mismatch (even subtle), S3 returns 403 Forbidden.
        # By omitting it, S3 won't validate Content-Type at all.
        # The browser still sends Content-Type during the PUT and S3 uses it for object metadata.
        response = client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
            },
            ExpiresIn=expiration
        )
        logger.info(f"Successfully generated presigned URL (first 100 chars): {response[:100]}...")
        return response
    except NoCredentialsError:
        logger.error("AWS credentials not found when generating presigned URL")
        raise HTTPException(status_code=500, detail="AWS credentials not configured on server")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        logger.error(f"S3 ClientError [{error_code}]: {error_msg}")
        raise HTTPException(status_code=500, detail=f"S3 Error [{error_code}]: {error_msg}")
    except Exception as e:
        logger.error(f"Unexpected error generating upload URL: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {type(e).__name__}: {str(e)}")


def generate_presigned_download_url(s3_key: str, expiration=300):
    client = get_s3_client()

    try:
        response = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        logger.error(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail="Could not generate download URL")


def list_files(prefix: str):
    client = get_s3_client()

    try:
        response = client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
        return response.get('Contents', [])
    except ClientError as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail="Could not list files from S3")


def delete_s3_object(s3_key: str):
    """Delete an object from S3"""
    client = get_s3_client()

    try:
        client.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        return True
    except ClientError as e:
        logger.error(f"Error deleting S3 object: {e}")
        raise HTTPException(status_code=500, detail="Could not delete file from S3")
