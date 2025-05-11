import logging
import json
import os
from datetime import datetime, timedelta
import re
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData, EventMetrics
from linkedin_jobs_scraper.query import Query, QueryOptions, QueryFilters
from job_transformer import transform_job_data

# Set up logging
logging.basicConfig(level=logging.INFO)

# Set LinkedIn authentication cookie
os.environ['LI_AT_COOKIE'] = 'AQEDAVqjf7EDx21DAAABlrurz3oAAAGW37hTek0AoJ3BSxqtwLOA9nfjVW2gam06X4VDyDoX6lKN2nwx3yyQBvwskqi9Ez8Vb5CgTtGAXHBS97kfz9kLejV7o6Iadt0z2yAfgM87_IOKmTbCAecBMf65'

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
        print(f"[ON_DATA] {data.title} | {data.company} | {data.place} | {actual_date.isoformat()}")

# Callback for metrics (every 25 jobs)
def on_metrics(metrics: EventMetrics):
    print(f"[ON_METRICS] {metrics}")

# Callback for errors
def on_error(error):
    print(f"[ON_ERROR] {error}")

# Callback when scraping ends
def on_end():
    # Create filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'linkedin_jobs_{timestamp}.json'
    
    # Write all collected data to a JSON file with pretty formatting
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(jobs_data, f, indent=2, ensure_ascii=False)
    print(f"[ON_END] Scraping finished. Data saved to {filename}")
    print(f"Total jobs scraped: {len(jobs_data)}")

# Create the scraper
scraper = LinkedinScraper(
    chrome_executable_path=None,  # Use default chromedriver in PATH
    chrome_binary_location=None,  # Use default Chrome install
    chrome_options=None,          # Default options
    headless=True,                # Run Chrome in headless mode
    max_workers=1,                # One thread/Chrome instance
    slow_mo=0.5,                  # Slow down to avoid rate-limiting (0.5 for authenticated mode)
    page_load_timeout=40
)

# Register event listeners
scraper.on(Events.DATA, on_data)
scraper.on(Events.ERROR, on_error)
scraper.on(Events.END, on_end)

# Define your search query and location
queries = [
    Query(
        query="Healthcare",  # Change job title as needed
        options=QueryOptions(
            locations=["San Francisco, CA, United States"],  # Change to your nearby area
            limit=5,  # Number of jobs to scrape
            filters=QueryFilters(
                # Optional: add filters such as time, type, experience, etc.
                # time=TimeFilters.WEEK,
                # type=[TypeFilters.FULL_TIME],
            )
        )
    )
]

# Run the scraper
scraper.run(queries)
scraper.close()