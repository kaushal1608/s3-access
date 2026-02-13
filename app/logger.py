import os
import logging

try:
    from aws_lambda_powertools import Logger
    logger = Logger(service="SecureFilePortal", level=os.getenv("LOG_LEVEL", "INFO"))
except ImportError:
    # Fallback for local/VM deployments without aws-lambda-powertools
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    logger = logging.getLogger("SecureFilePortal")
