import logging
import json
import os
from datetime import datetime, timedelta
import re
import boto3
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData, EventMetrics
from linkedin_jobs_scraper.query import Query, QueryOptions, QueryFilters
from job_llm import keep_or_reject

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
resume = None

# Set LinkedIn authentication cookie
os.environ['LI_AT_COOKIE'] = 'AQEDAVqjf7EDx21DAAABlrurz3oAAAGW37hTek0AoJ3BSxqtwLOA9nfjVW2gam06X4VDyDoX6lKN2nwx3yyQBvwskqi9Ez8Vb5CgTtGAXHBS97kfz9kLejV7o6Iadt0z2yAfgM87_IOKmTbCAecBMf65'

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('jobs')
s3_client = boto3.client('s3')

def get_latest_resume():
    """Get the latest resume from S3 processed-resumes directory"""
    try:
        # List objects in the processed-resumes/user123/ prefix
        response = s3_client.list_objects_v2(
            Bucket='matchmemaybe',
            Prefix='processed-resumes/user123/'
        )
        
        if 'Contents' not in response:
            logger.error("No resume files found in S3 bucket")
            return None
        
        # Get the latest file based on LastModified
        latest_file = max(response['Contents'], key=lambda x: x['LastModified'])
        
        # Get the file content
        response = s3_client.get_object(
            Bucket='matchmemaybe',
            Key=latest_file['Key']
        )
        
        # Parse the JSON content
        resume_data = json.loads(response['Body'].read().decode('utf-8'))
        return resume_data  # Return the entire resume data including search query
            
    except Exception as e:
        logger.error(f"Error reading resume from S3: {str(e)}")
        return None

def parse_relative_time(time_str):
    """Convert relative time string to actual datetime"""
    now = datetime.now()
    
    # Extract number and unit from string
    match = re.match(r'(\d+)\s+(\w+)', time_str.lower())
    if not match:
        return now  # Return current time if parsing fails
    
    number = int(match.group(1))
    unit = match.group(2)
    
    # Convert to timedelta
    if 'minute' in unit:
        return now - timedelta(minutes=number)
    elif 'hour' in unit:
        return now - timedelta(hours=number)
    elif 'day' in unit:
        return now - timedelta(days=number)
    elif 'week' in unit:
        return now - timedelta(weeks=number)
    elif 'month' in unit:
        return now - timedelta(days=number * 30)  # Approximate month as 30 days
    elif 'year' in unit:
        return now - timedelta(days=number * 365)  # Approximate year as 365 days
    
    return now

# Callback for each job scraped
def on_data(data: EventData):
    # Convert relative time to actual date
    actual_date = parse_relative_time(data.date_text)
    
    # Create raw job data
    raw_job_data = {
        "job_id": data.job_id,
        "title": data.title,
        "company": data.company,
        "description": data.description,
        "date": actual_date.isoformat(),
        "place": data.place,
        "company_link": data.company_link,
        "company_img_link": data.company_img_link,
        "link": data.link
    }
    
    result = keep_or_reject(raw_job_data, resume['output'])
    if result['keep']:
        try:
            # Add to DynamoDB
            raw_job_data['key_requirements'] = result['key_requirements']
            raw_job_data['key_descriptions'] = result['key_descriptions']
            raw_job_data['match_percentage'] = result['match_percentage']
            table.put_item(Item=raw_job_data)
            logger.info(f"[ON_DATA] Added to DynamoDB: {data.title} | {data.company} | {data.place} | {actual_date.isoformat()}")
        except Exception as e:
            logger.error(f"Error adding to DynamoDB: {str(e)}")

# Callback for when scraping is done
def on_end():
    pass

# Main scraping function
def scrape_jobs():
    scraper = LinkedinScraper(
        headless=True,
        max_workers=1,
        slow_mo=1
    )

    # Get the latest resume
    global resume
    resume = get_latest_resume()
    if not resume:
        logger.error("Could not load resume, skipping job scraping")
        return

    # Add event listeners
    scraper.on(Events.DATA, on_data)
    scraper.on(Events.END, on_end)

    # Get search queries from resume data
    if not resume.get('searchQueries'):
        logger.error("No search queries found in resume data")
        return

    # Define queries using all search queries from resume
    queries = [
        Query(
            query=search_query['query'],
            options=QueryOptions(
                locations=search_query['locations'],
                limit=search_query['limit']
            )
        )
        for search_query in resume['searchQueries']
    ]

    logger.info(f"Running scraper with {len(queries)} different search queries")
    for query in queries:
        logger.info(f"Query: {query.query}, Locations: {query.options.locations}")

    # Run the scraper
    scraper.run(queries)

if __name__ == "__main__":
    scrape_jobs()