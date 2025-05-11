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
    valid_industries = {
        'TECH', 'FINANCE', 'MEDICAL', 'SOCIAL', 'RETAIL', 
        'MANUFACTURING', 'CONSULTING', 'MARKETING', 'LEGAL', 'UNKNOWN'
    }
    
    return {
        'job_type': details.get('job_type', 'UNKNOWN').upper() if details.get('job_type', 'UNKNOWN').upper() in valid_job_types else 'UNKNOWN',
        'exp_level': details.get('exp_level', 'UNKNOWN').upper() if details.get('exp_level', 'UNKNOWN').upper() in valid_exp_levels else 'UNKNOWN',
        'industry': details.get('industry', 'UNKNOWN').upper() if details.get('industry', 'UNKNOWN').upper() in valid_industries else 'UNKNOWN'
    }

@lru_cache(maxsize=100)
def infer_job_details(description: str, title: str) -> Dict[str, str]:
    """Use Bedrock to infer job type, experience level, and industry"""
    try:
        description = validate_text_length(description)
        prompt = f"""Human: Analyze this job posting and categorize it according to the following rules:

Job Title: {title}
Job Description: {description}

Categorize the job into these industries:
- TECH (software, IT, engineering, data science, technology, etc.)
- FINANCE (banking, investment, accounting, insurance, etc.)
- MEDICAL (healthcare, medical, clinical, pharmaceutical, etc.)
- SOCIAL (education, non-profit, community services, etc.)
- RETAIL (sales, customer service, store management, etc.)
- MANUFACTURING (production, operations, supply chain, etc.)
- CONSULTING (business consulting, management consulting, etc.)
- MARKETING (advertising, public relations, digital marketing, etc.)
- LEGAL (law, compliance, regulatory, etc.)
- OTHER (if none of the above categories fit)

Important rules:
1. If the job title or description contains technology, software, engineering, data, or IT terms, categorize it as TECH regardless of the company's industry
2. Only categorize as MEDICAL if the role itself is medical/healthcare focused (not just because the company is in healthcare)
3. For internships, look at the department/team they'll be working in to determine the industry

Return ONLY a JSON object with these exact fields:
{{
    "industry": "TECH",
    "job_type": "FULL_TIME",
    "exp_level": "SENIOR"
}}

Do not include any other text or explanation. The response must be valid JSON.

Assistant: I'll analyze the job posting and return the categorization in the requested JSON format."""
        
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
                completion_text = response_body.get('content', [{}])[0].get('text', '{}').strip()
                
                # Clean up the response text to ensure it's valid JSON
                completion_text = re.sub(r'^[^{]*', '', completion_text)  # Remove any text before {
                completion_text = re.sub(r'[^}]*$', '', completion_text)  # Remove any text after }
                
                try:
                    details = json.loads(completion_text)
                    logger.info(f"Successfully parsed job details: {details}")
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parsing failed, trying regex extraction: {str(e)}")
                    # If JSON parsing fails, try to extract values using regex
                    job_type = re.search(r'"job_type"\s*:\s*"([^"]+)"', completion_text)
                    exp_level = re.search(r'"exp_level"\s*:\s*"([^"]+)"', completion_text)
                    industry = re.search(r'"industry"\s*:\s*"([^"]+)"', completion_text)
                    
                    details = {
                        'job_type': job_type.group(1) if job_type else 'UNKNOWN',
                        'exp_level': exp_level.group(1) if exp_level else 'UNKNOWN',
                        'industry': industry.group(1) if industry else 'UNKNOWN'
                    }
                    logger.info(f"Extracted job details using regex: {details}")
                
                # Validate and normalize the details
                validated_details = validate_job_details(details)
                logger.info(f"Validated job details: {validated_details}")
                
                # If all fields are UNKNOWN, try keyword-based inference as fallback
                if all(v == 'UNKNOWN' for v in validated_details.values()):
                    logger.warning("All fields are UNKNOWN, using keyword-based inference")
                    text_lower = f"{title} {description}".lower()
                    
                    # Job type inference
                    if any(word in text_lower for word in ['full-time', 'full time', 'permanent']):
                        validated_details['job_type'] = 'FULL_TIME'
                    elif any(word in text_lower for word in ['contract', 'temporary', 'temp']):
                        validated_details['job_type'] = 'CONTRACT'
                    elif any(word in text_lower for word in ['part-time', 'part time']):
                        validated_details['job_type'] = 'PART_TIME'
                    elif any(word in text_lower for word in ['intern', 'internship']):
                        validated_details['job_type'] = 'INTERNSHIP'
                    
                    # Experience level inference
                    if any(word in text_lower for word in ['senior', 'lead', 'principal']):
                        validated_details['exp_level'] = 'SENIOR'
                    elif any(word in text_lower for word in ['mid-level', 'mid level', 'intermediate']):
                        validated_details['exp_level'] = 'MID'
                    elif any(word in text_lower for word in ['entry', 'junior', 'graduate', 'intern']):
                        validated_details['exp_level'] = 'ENTRY'
                    
                    # Industry inference with priority for tech roles
                    if any(word in text_lower for word in [
                        'software', 'developer', 'engineer', 'programming', 'technology', 'tech',
                        'data', 'it', 'information technology', 'computer', 'systems', 'devops',
                        'cloud', 'infrastructure', 'automation', 'test engineering', 'feature development'
                    ]):
                        validated_details['industry'] = 'TECH'
                    elif any(word in text_lower for word in [
                        'healthcare', 'medical', 'clinical', 'health', 'hospital', 'patient',
                        'doctor', 'nurse', 'pharmacy', 'pharmaceutical', 'healthcare staffing',
                        'medical staffing', 'clinical research', 'healthcare sales'
                    ]) and not any(word in text_lower for word in ['software', 'developer', 'engineer', 'data', 'it']):
                        validated_details['industry'] = 'MEDICAL'
                    elif any(word in text_lower for word in ['bank', 'finance', 'investment', 'accounting']):
                        validated_details['industry'] = 'FINANCE'
                    elif any(word in text_lower for word in ['education', 'teaching', 'school']):
                        validated_details['industry'] = 'SOCIAL'
                    elif any(word in text_lower for word in ['retail', 'store', 'sales']):
                        validated_details['industry'] = 'RETAIL'
                    elif any(word in text_lower for word in ['manufacturing', 'production', 'factory']):
                        validated_details['industry'] = 'MANUFACTURING'
                    elif any(word in text_lower for word in ['consulting', 'consultant']):
                        validated_details['industry'] = 'CONSULTING'
                    elif any(word in text_lower for word in ['marketing', 'advertising', 'pr']):
                        validated_details['industry'] = 'MARKETING'
                    elif any(word in text_lower for word in ['law', 'legal', 'attorney']):
                        validated_details['industry'] = 'LEGAL'
                    
                    logger.info(f"Keyword-based inference results: {validated_details}")
                
                return validated_details
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt == MAX_RETRIES - 1:
                    logger.error(f"Failed to infer job details after {MAX_RETRIES} attempts")
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
    """Normalize job title for GSI1SK"""
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
        'SDE': 'SOFTWARE_DEVELOPMENT_ENGINEER',
        'QUANT': 'QUANTITATIVE',
        'ANALYST': 'ANALYST',
        'INTERN': 'INTERN'
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
        
        # Infer job details using both title and description
        job_details = infer_job_details(raw_job_json['description'], raw_job_json['title'])
        
        # Normalize title for GSI1SK
        normalized_title = normalize_title(raw_job_json['title'])
        
        # Normalize company name for GSI1PK
        normalized_company = raw_job_json['company'].upper().replace(' ', '_')
        
        # Construct transformed item
        transformed_item = {
            "PK": f"JOB#{job_details['industry']}",
            "SK": f"POSTED#{raw_job_json['date']}#{raw_job_json['job_id']}",
            "GSI1PK": f"COMPANY#{normalized_company}",
            "GSI1SK": f"ROLE#{normalized_title}",
            "title": raw_job_json['title'],
            "company": raw_job_json['company'],
            "location": raw_job_json.get('place', 'UNKNOWN'),
            "description": validate_text_length(raw_job_json['description']),
            "posted_date": raw_job_json['date'],
            "job_id": raw_job_json['job_id'],
            "search_embedding": [],
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