import logging
import json
import os
from datetime import datetime, timedelta
import re
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData, EventMetrics
from linkedin_jobs_scraper.query import Query, QueryOptions, QueryFilters
from job_transformer import transform_job_data
from opensearch_client import OpenSearchClient

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set LinkedIn authentication cookie
os.environ['LI_AT_COOKIE'] = 'AQEDAVqjf7EDx21DAAABlrurz3oAAAGW37hTek0AoJ3BSxqtwLOA9nfjVW2gam06X4VDyDoX6lKN2nwx3yyQBvwskqi9Ez8Vb5CgTtGAXHBS97kfz9kLejV7o6Iadt0z2yAfgM87_IOKmTbCAecBMf65'

# Initialize OpenSearch client
# OPENSEARCH_HOST = 'search-jobs-search-zl6crmr4fd77xvf75tji65sxxe.us-west-2.es.amazonaws.com'
OPENSEARCH_HOST = 'search-new-job-search-vbyza4dcejvsdpmnb54hvy7su4.us-west-2.es.amazonaws.com'
INDEX_NAME = 'jobs'
opensearch_client = OpenSearchClient(OPENSEARCH_HOST)

# Create index if it doesn't exist
try:
    opensearch_client.create_index(INDEX_NAME)
except Exception as e:
    logger.error(f"Error creating index: {str(e)}")

# List to store all job data
jobs_data = []

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
    
    # Transform the job data
    transformed_job = transform_job_data(raw_job_data)
    if transformed_job:
        jobs_data.append(transformed_job)
        logger.info(f"[ON_DATA] {data.title} | {data.company} | {data.place} | {actual_date.isoformat()}")

# Callback for when scraping is done
def on_end():
    if jobs_data:
        try:
            # Bulk index all jobs
            opensearch_client.bulk_index_jobs(INDEX_NAME, jobs_data)
            logger.info(f"Successfully indexed {len(jobs_data)} jobs")
        except Exception as e:
            logger.error(f"Error indexing jobs: {str(e)}")

# Main scraping function
def scrape_jobs():
    scraper = LinkedinScraper(
        headless=True,
        max_workers=1,
        slow_mo=1
    )

    # Add event listeners
    scraper.on(Events.DATA, on_data)
    scraper.on(Events.END, on_end)

    # Define queries
    queries = [
        Query(
            query='Software Engineer',
            options=QueryOptions(
                locations=['United States'],
                limit=5
            )
        )
    ]

    # Run the scraper
    scraper.run(queries)

if __name__ == "__main__":
    scrape_jobs()