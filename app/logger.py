from aws_lambda_powertools import Logger
import os

# Initialize Logger
# Powertools will automatically output structured JSON
logger = Logger(service="SecureFilePortal", level=os.getenv("LOG_LEVEL", "INFO"))
