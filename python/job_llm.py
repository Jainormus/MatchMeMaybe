import boto3
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import re
from botocore.exceptions import ClientError
import time
import os
from pathlib import Path
from dotenv import load_dotenv

# Get the path to the parent directory (where .env is located)
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'

# Load environment variables from .env file
load_dotenv(dotenv_path=env_path)
os.environ["AWS_DEFAULT_REGION"] = os.getenv("AWS_REGION", "us-west-2")

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

def keep_or_reject(job: Dict[str, Any], resume: Dict[str, Any]) -> Dict[str, Any]:
    """Use Bedrock to determine if a job should be kept based on its description"""
    prompt = f"""Here is a job description: {json.dumps(job)}\n
    Here is a user's resume: {json.dumps(resume)}\n
    You are being used by a job search engine to determine if this job should be kept in the database, you must ONLY return a JSON object.
    Based on the job description and the user's resume, determine whether the user has a good chance of getting an interview.
    Consider the user's skills, experience, activities, projects, and education (especially whether they are still in school).
    If the user has a good chance of getting an interview, return ONLYa JSON object with the following fields:
    {{
        "keep": true,
        "key_requirements": [list of key requirements for the job, keep it to 5 max],
        "key_descriptions": [list of key descriptions of the job, keep it to 5 max],
        "match_percentage": 0-100 (how well the user's resume matches the job description)
    }}
    If the user does not have a good chance of getting an interview, return ONLY a JSON object with the following fields:
    {{
        "keep": false,
        "match_percentage": 0-100
    }}
    You must ONLY return a JSON object, do not return anything else.
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
            # Extract just the JSON part from the response
            content = response_body['content'][0]['text']
            # Find the JSON object in the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end != -1:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
            else:
                logger.error("Could not find JSON in response")
                return {
                    "keep": False,
                    "match_percentage": 0
                }
            
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                logger.error(f"Failed to infer job details after {MAX_RETRIES} attempts")
                return {
                    "keep": False,
                    "match_percentage": 0
                }
            time.sleep(RETRY_DELAY * (attempt + 1))
