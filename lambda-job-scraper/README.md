# Lambda Job Scraper

This AWS Lambda function connects to an EC2 instance and runs a job scraping script.

## Prerequisites

1. AWS Lambda function with the following IAM permissions:
   - `ssm:SendCommand`
   - `ssm:GetCommandInvocation`
   - `ec2:DescribeInstances`

2. EC2 instance must have:
   - SSM agent installed and running
   - IAM role with SSM permissions
   - The job scraping script at `/home/ec2-user/python/scrape_jobs.py`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a ZIP file for deployment:
   ```bash
   zip -r function.zip index.js node_modules/
   ```

3. Deploy to AWS Lambda:
   - Create a new Lambda function
   - Upload the ZIP file
   - Set the handler to `index.handler`
   - Configure the appropriate IAM role
   - Set the timeout to at least 1 minute (the function polls for command completion)

## Usage

The Lambda function can be triggered manually or set up with a schedule using EventBridge (CloudWatch Events).

The function will:
1. Connect to the EC2 instance using SSM
2. Change to the specified directory
3. Run the scraping script
4. Return the output and any errors 