import boto3
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import re
from botocore.exceptions import ClientError
import time
from functools import lru_cache
import os
from pathlib import Path
from dotenv import load_dotenv

# Get the path to the parent directory (where .env is located)
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'

# Load environment variables from .env file
load_dotenv(dotenv_path=env_path)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'us-west-2')
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Initialize AWS clients with error handling
try:
    session = boto3.Session(
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        aws_session_token=os.getenv('AWS_SESSION_TOKEN'),
        region_name=AWS_REGION
    )
    bedrock = session.client('bedrock-runtime', region_name=AWS_REGION)
    logger.info("Successfully initialized AWS Bedrock client")
except ClientError as e:
    logger.error(f"AWS initialization error: {str(e)}")
    raise


@lru_cache(maxsize=100)
def keep_or_reject(job: Dict[str, Any]) -> Dict[str, str]:
    """Use Bedrock to infer job type, experience level, and industry"""
    prompt = f"""Here is a resume: {resume}\n
    Here is a job description: {job}\n

    You are being used by a job search engine to narrow down the jobs that the user should apply to.
    Based on the resume and job description, if you think the resume is a good fit for the job and/or
    has a good change of getting the user an interview, return a JSON object with the following fields:
    {
        "keep": true/false,
        "match_percentage": 0-100
    }
    """

    for attempt in range(MAX_RETRIES):
        try:
            response = bedrock.invoke_model(
                modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
                body=json.dumps({
                    'messages': [{
                        'role': 'user',
                        'content': prompt
                    }],
                    'max_tokens': 200,
                    'temperature': 0.1,
                    'anthropic_version': 'bedrock-2023-05-31'
                })
            )
            
            response_body = json.loads(response['body'].read())
            return response_body
            
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                logger.error(f"Failed to infer job details after {MAX_RETRIES} attempts")
                return {
                    "keep": False,
                    "match_percentage": 0
                }
            time.sleep(RETRY_DELAY * (attempt + 1))
