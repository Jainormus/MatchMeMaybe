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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'us-west-2')
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Initialize AWS clients with error handling
try:
    session = boto3.Session()
    bedrock = session.client('bedrock-runtime', region_name=AWS_REGION)
    logger.info("Successfully initialized AWS Bedrock client")
except ClientError as e:
    logger.error(f"AWS initialization error: {str(e)}")
    raise

def validate_text_length(text: str, max_length: int = 8000) -> str:
    """Truncate text if it exceeds maximum length"""
    if len(text) > max_length:
        logger.warning(f"Text truncated from {len(text)} to {max_length} characters")
        return text[:max_length]
    return text

def get_bedrock_embedding(text: str) -> List[float]:
    """Placeholder for embedding generation - returns empty list for now"""
    # TODO: Implement actual embedding generation
    return []

def validate_job_details(details: Dict[str, str]) -> Dict[str, str]:
    """Validate and normalize job details"""
    valid_job_types = {'FULL_TIME', 'CONTRACT', 'PART_TIME', 'INTERNSHIP', 'UNKNOWN'}
    valid_exp_levels = {'ENTRY', 'MID', 'SENIOR', 'UNKNOWN'}
    
    return {
        'job_type': details.get('job_type', 'UNKNOWN').upper() if details.get('job_type', 'UNKNOWN').upper() in valid_job_types else 'UNKNOWN',
        'exp_level': details.get('exp_level', 'UNKNOWN').upper() if details.get('exp_level', 'UNKNOWN').upper() in valid_exp_levels else 'UNKNOWN',
        'industry': details.get('industry', 'UNKNOWN').upper()
    }

def infer_job_details(description: str) -> Dict[str, str]:
    """Simple job details inference based on keywords"""
    description = description.lower()
    
    # Simple keyword-based inference
    job_type = 'UNKNOWN'
    if any(word in description for word in ['full-time', 'full time', 'permanent']):
        job_type = 'FULL_TIME'
    elif any(word in description for word in ['contract', 'temporary', 'temp']):
        job_type = 'CONTRACT'
    elif any(word in description for word in ['part-time', 'part time']):
        job_type = 'PART_TIME'
    elif any(word in description for word in ['intern', 'internship']):
        job_type = 'INTERNSHIP'
    
    exp_level = 'UNKNOWN'
    if any(word in description for word in ['senior', 'lead', 'principal']):
        exp_level = 'SENIOR'
    elif any(word in description for word in ['mid-level', 'mid level', 'intermediate']):
        exp_level = 'MID'
    elif any(word in description for word in ['entry', 'junior', 'graduate']):
        exp_level = 'ENTRY'
    
    # Default to TECH industry for now
    industry = 'TECH'
    
    return {
        'job_type': job_type,
        'exp_level': exp_level,
        'industry': industry
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

def transform_job_data(raw_job_json: Dict[str, Any]) -> Dict[str, Any]:
    """Transform raw job data into the desired format"""
    try:
        # Validate required fields
        required_fields = ['job_id', 'title', 'company', 'description', 'date']
        if not all(field in raw_job_json for field in required_fields):
            logger.error(f"Missing required fields in job data: {raw_job_json.get('job_id', 'UNKNOWN')}")
            return None

        # Generate embeddings
        combined_text = f"{raw_job_json['title']} {raw_job_json['description']}"
        search_embedding = get_bedrock_embedding(combined_text)
        
        # Infer job details
        job_details = infer_job_details(raw_job_json['description'])
        
        # Normalize title for GSI1SK
        normalized_title = normalize_title(raw_job_json['title'])
        
        # Construct transformed item
        transformed_item = {
            "PK": f"JOB#{job_details['industry']}",
            "SK": f"POSTED#{raw_job_json['date']}#{raw_job_json['job_id']}",
            "GSI1PK": f"COMPANY#{raw_job_json['company']}",
            "GSI1SK": f"ROLE#{normalized_title}",
            "title": raw_job_json['title'],
            "company": raw_job_json['company'],
            "location": raw_job_json.get('place', 'UNKNOWN'),
            "description": validate_text_length(raw_job_json['description']),
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
        
        return transformed_item
        
    except Exception as e:
        logger.error(f"Error transforming job {raw_job_json.get('job_id', 'UNKNOWN')}: {str(e)}")
        return None 