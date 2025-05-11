import boto3
import logging
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
import json
import os
from dotenv import load_dotenv
from pathlib import Path

# Get the path to the parent directory (where .env is located)
parent_dir = Path(__file__).parent.parent
env_path = parent_dir / '.env'

# Load environment variables from .env file
load_dotenv(dotenv_path=env_path)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenSearchClient:
    def __init__(self, host, region='us-west-2'):
        self.host = host
        self.region = region
        self.client = self._create_client()

    def _create_client(self):
        """Create an OpenSearch client with AWS authentication"""
        # Get credentials from environment variables
        access_key = os.getenv('AWS_ACCESS_KEY_ID')
        secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        session_token = os.getenv('AWS_SESSION_TOKEN')

        if not access_key or not secret_key:
            raise ValueError("AWS credentials not found in environment variables")

        awsauth = AWS4Auth(
            access_key,
            secret_key,
            self.region,
            'es',
            session_token=session_token
        )

        return OpenSearch(
            hosts=[{'host': self.host, 'port': 443}],
            http_auth=awsauth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection
        )

    def create_index(self, index_name):
        """Create an index with mappings for job data"""
        if not self.client.indices.exists(index=index_name):
            mappings = {
                "mappings": {
                    "properties": {
                        "title": {"type": "text", "analyzer": "standard"},
                        "company": {"type": "keyword"},
                        "location": {"type": "keyword"},
                        "description": {"type": "text", "analyzer": "standard"},
                        "posted_date": {"type": "date"},
                        "job_id": {"type": "keyword"},
                        "job_type": {"type": "keyword"},
                        "exp_level": {"type": "keyword"},
                        "industry": {"type": "keyword"},
                        "company_link": {"type": "keyword"},
                        "company_img_link": {"type": "keyword"},
                        "link": {"type": "keyword"},
                        "processed_at": {"type": "date"}
                    }
                }
            }
            
            try:
                self.client.indices.create(index=index_name, body=mappings)
                logger.info(f"Created index: {index_name}")
            except Exception as e:
                logger.error(f"Error creating index {index_name}: {str(e)}")
                raise

    def index_job(self, index_name, job_data):
        """Index a single job document"""
        try:
            response = self.client.index(
                index=index_name,
                body=job_data,
                id=job_data['job_id'],
                refresh=True
            )
            logger.info(f"Indexed job {job_data['job_id']} successfully")
            return response
        except Exception as e:
            logger.error(f"Error indexing job {job_data.get('job_id', 'UNKNOWN')}: {str(e)}")
            raise

    def bulk_index_jobs(self, index_name, jobs_data):
        """Bulk index multiple job documents"""
        if not jobs_data:
            return

        bulk_data = []
        for job in jobs_data:
            # Add index action
            bulk_data.append({"index": {"_index": index_name, "_id": job['job_id']}})
            # Add document
            bulk_data.append(job)

        try:
            response = self.client.bulk(body=bulk_data, refresh=True)
            if response.get('errors'):
                logger.error(f"Bulk indexing had errors: {json.dumps(response, indent=2)}")
            else:
                logger.info(f"Successfully bulk indexed {len(jobs_data)} jobs")
            return response
        except Exception as e:
            logger.error(f"Error in bulk indexing: {str(e)}")
            raise

    def search_jobs(self, index_name, query, size=10):
        """Search for jobs using a query"""
        try:
            response = self.client.search(
                index=index_name,
                body=query,
                size=size
            )
            return response
        except Exception as e:
            logger.error(f"Error searching jobs: {str(e)}")
            raise 