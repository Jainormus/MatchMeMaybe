from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import boto3
from datetime import datetime
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('jobs')
saved_jobs_table = dynamodb.Table('saved_jobs')

# Initialize S3 client
s3_client = boto3.client('s3')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'matchmemaybe')

class Job(BaseModel):
    job_id: str
    title: str
    company: str
    description: str
    date: str
    place: str
    company_link: Optional[str] = None
    company_img_link: Optional[str] = None
    link: str
    key_requirements: Optional[List[str]] = None
    key_descriptions: Optional[List[str]] = None
    match_percentage: Optional[float] = None
    status: Optional[str] = None
    saved_date: Optional[str] = None

@app.get("/api/jobs", response_model=List[Job])
async def get_jobs():
    try:
        response = jobs_table.scan()
        jobs = response.get('Items', [])
        
        # Sort jobs by date (most recent first)
        jobs.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    try:
        response = jobs_table.get_item(Key={'job_id': job_id})
        job = response.get('Item')
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    try:
        # Get the job first to ensure it exists
        job = jobs_table.get_item(Key={'job_id': job_id})
        if not job.get('Item'):
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Delete from jobs table
        jobs_table.delete_item(Key={'job_id': job_id})
        return {"message": "Job deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/jobs/{job_id}/save")
async def save_job(job_id: str):
    try:
        # Get the job from jobs table
        job = jobs_table.get_item(Key={'job_id': job_id})
        if not job.get('Item'):
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = job['Item']
        # Add saved date and status
        job_data['saved_date'] = datetime.now().isoformat()
        job_data['status'] = 'saved'
        
        # Save to saved_jobs table
        saved_jobs_table.put_item(Item=job_data)
        
        # Delete from jobs table
        jobs_table.delete_item(Key={'job_id': job_id})
        
        return {"message": "Job saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/saved-jobs", response_model=List[Job])
async def get_saved_jobs():
    try:
        response = saved_jobs_table.scan()
        print(response)
        jobs = response.get('Items', [])
        
        # Sort jobs by saved date (most recent first)
        jobs.sort(key=lambda x: x.get('saved_date', ''), reverse=True)
        
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/saved-jobs/{job_id}/status")
async def update_job_status(job_id: str, status_update: dict):
    try:
        # Get the job first to ensure it exists
        job = saved_jobs_table.get_item(Key={'job_id': job_id})
        if not job.get('Item'):
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Update the status
        saved_jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression="SET #status = :status",
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":status": status_update['status']
            }
        )
        
        return {"message": "Job status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/saved-jobs/{job_id}")
async def delete_saved_job(job_id: str):
    try:
        # Get the job first to ensure it exists
        job = saved_jobs_table.get_item(Key={'job_id': job_id})
        if not job.get('Item'):
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Delete from saved_jobs table
        saved_jobs_table.delete_item(Key={'job_id': job_id})
        return {"message": "Job deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs_status")
async def get_job_processing_status():
    try:
        # Scan the jobs table with a limit of 1 to check if there are any items
        response = jobs_table.scan(Limit=1)
        # Return true if there are any items in the table
        if len(response.get('Items', [])) > 0:
            return {"status": "completed"}
        else:
            return {"status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 