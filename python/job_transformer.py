import boto3
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import re
from botocore.exceptions import ClientError
import time
from functools import lru_cache

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS Configuration
AWS_REGION = 'us-west-2'  # Change to your region
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Initialize AWS clients with error handling
try:
    bedrock = boto3.client('bedrock-runtime', region_name=AWS_REGION)
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table('JobsTable')
    
    # Verify table exists
    table.load()
except ClientError as e:
    logger.error(f"AWS initialization error: {str(e)}")
    raise

def validate_text_length(text: str, max_length: int = 8000) -> str:
    """Truncate text if it exceeds maximum length"""
    if len(text) > max_length:
        logger.warning(f"Text truncated from {len(text)} to {max_length} characters")
        return text[:max_length]
    return text

@lru_cache(maxsize=100)
def get_bedrock_embedding(text: str) -> List[float]:
    """Generate embeddings using Amazon Titan with retries and caching"""
    text = validate_text_length(text)
    
    for attempt in range(MAX_RETRIES):
        try:
            response = bedrock.invoke_model(
                modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
                body=json.dumps({
                    'inputText': text
                })
            )
            response_body = json.loads(response['body'].read())
            return response_body['embedding']
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                logger.error(f"Failed to generate embedding after {MAX_RETRIES} attempts: {str(e)}")
                return []
            time.sleep(RETRY_DELAY * (attempt + 1))

def validate_job_details(details: Dict[str, str]) -> Dict[str, str]:
    """Validate and normalize job details"""
    valid_job_types = {'FULL_TIME', 'CONTRACT', 'PART_TIME', 'INTERNSHIP', 'UNKNOWN'}
    valid_exp_levels = {'ENTRY', 'MID', 'SENIOR', 'UNKNOWN'}
    
    return {
        'job_type': details.get('job_type', 'UNKNOWN').upper() if details.get('job_type', 'UNKNOWN').upper() in valid_job_types else 'UNKNOWN',
        'exp_level': details.get('exp_level', 'UNKNOWN').upper() if details.get('exp_level', 'UNKNOWN').upper() in valid_exp_levels else 'UNKNOWN',
        'industry': details.get('industry', 'UNKNOWN').upper()
    }

@lru_cache(maxsize=100)
def infer_job_details(description: str) -> Dict[str, str]:
    """Use Bedrock to infer job type, experience level, and industry with caching"""
    try:
        description = validate_text_length(description)
        prompt = f"""Analyze this job description and extract:
        1. Job type (FULL_TIME, CONTRACT, PART_TIME, INTERNSHIP)
        2. Experience level (ENTRY, MID, SENIOR)
        3. Industry (TECH, FINANCE, HEALTHCARE, etc.)
        
        Job Description:
        {description}
        
        Return as JSON with keys: job_type, exp_level, industry"""
        
        for attempt in range(MAX_RETRIES):
            try:
                response = bedrock.invoke_model(
                    modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
                    body=json.dumps({
                        'prompt': prompt,
                        'max_tokens': 200,
                        'temperature': 0.1
                    })
                )
                
                response_body = json.loads(response['body'].read())
                details = json.loads(response_body['completion'])
                return validate_job_details(details)
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    logger.error(f"Failed to infer job details after {MAX_RETRIES} attempts: {str(e)}")
                    return {
                        'job_type': 'UNKNOWN',
                        'exp_level': 'UNKNOWN',
                        'industry': 'UNKNOWN'
                    }
                time.sleep(RETRY_DELAY * (attempt + 1))
    except Exception as e:
        logger.error(f"Error in job details inference: {str(e)}")
        return {
            'job_type': 'UNKNOWN',
            'exp_level': 'UNKNOWN',
            'industry': 'UNKNOWN'
        }

def normalize_title(title: str) -> str:
    """Normalize job title for GSI1SK with improved normalization"""
    # Remove common suffixes and special characters
    title = re.sub(r'\(.*?\)', '', title)  # Remove parenthetical text
    title = re.sub(r'[^\w\s]', '', title)  # Remove special characters
    title = title.strip().upper()
    
    # Common title normalizations
    normalizations = {
        'SR': 'SENIOR',
        'JR': 'JUNIOR',
        'DEV': 'DEVELOPER',
        'ENG': 'ENGINEER',
        'SW': 'SOFTWARE',
        'ML': 'MACHINE_LEARNING',
        'AI': 'ARTIFICIAL_INTELLIGENCE',
        'DS': 'DATA_SCIENCE',
        'PM': 'PRODUCT_MANAGER',
        'UX': 'USER_EXPERIENCE',
        'UI': 'USER_INTERFACE',
        'QA': 'QUALITY_ASSURANCE',
        'SRE': 'SITE_RELIABILITY_ENGINEER',
        'SDE': 'SOFTWARE_DEVELOPMENT_ENGINEER'
    }
    
    for short, full in normalizations.items():
        title = title.replace(short, full)
    
    return title

def transform_and_push_to_dynamodb(raw_job_json: Dict[str, Any]) -> bool:
    """Transform raw job data and push to DynamoDB with improved error handling"""
    try:
        # Validate required fields
        required_fields = ['job_id', 'title', 'company', 'description', 'date']
        if not all(field in raw_job_json for field in required_fields):
            logger.error(f"Missing required fields in job data: {raw_job_json.get('job_id', 'UNKNOWN')}")
            return False

        # Generate embeddings
        combined_text = f"{raw_job_json['title']} {raw_job_json['description']}"
        search_embedding = get_bedrock_embedding(combined_text)
        
        # Infer job details using Bedrock
        job_details = infer_job_details(raw_job_json['description'])
        
        # Normalize title for GSI1SK
        normalized_title = normalize_title(raw_job_json['title'])
        
        # Construct DynamoDB item
        dynamo_item = {
            "PK": f"JOB#{job_details['industry']}",
            "SK": f"POSTED#{raw_job_json['date']}#{raw_job_json['job_id']}",
            "GSI1PK": f"COMPANY#{raw_job_json['company']}",
            "GSI1SK": f"ROLE#{normalized_title}",
            "title": raw_job_json['title'],
            "company": raw_job_json['company'],
            "location": raw_job_json.get('place', 'UNKNOWN'),
            "description": raw_job_json['description'],
            "posted_date": raw_job_json['date'],
            "job_id": raw_job_json['job_id'],
            "search_embedding": search_embedding,
            "job_type": job_details['job_type'],
            "exp_level": job_details['exp_level'],
            "company_link": raw_job_json.get('company_link', ''),
            "company_img_link": raw_job_json.get('company_img_link', ''),
            "link": raw_job_json.get('link', ''),
            "processed_at": datetime.now().isoformat()
        }
        
        # Push to DynamoDB with retries
        for attempt in range(MAX_RETRIES):
            try:
                table.put_item(Item=dynamo_item)
                logger.info(f"Successfully pushed job {raw_job_json['job_id']} to DynamoDB")
                return True
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    logger.error(f"Failed to push to DynamoDB after {MAX_RETRIES} attempts: {str(e)}")
                    return False
                time.sleep(RETRY_DELAY * (attempt + 1))
        
    except Exception as e:
        logger.error(f"Error transforming/pushing job {raw_job_json.get('job_id', 'UNKNOWN')}: {str(e)}")
        return False 