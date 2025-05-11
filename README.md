# MatchMeMaybe
A modern job matching platform built with React and AWS services that helps connect job seekers with their ideal opportunities.


Michael Ip : Backend + AWS
Justin Le : Backend + AWS
Nicholas Hoang : Frontend


## Technologies Used
### Frontend
- React 18
- TypeScript
- Redux Toolkit & Zustand for state management
- TailwindCSS for styling
- Framer Motion for animations
- React Router for navigation
- AWS Amplify for authentication


### Backend
- AWS Lambda for serverless functions
- AWS DynamoDB for database
- AWS S3 for file storage
- AWS Bedrock for AI/ML capabilities
- AWS Textract for document processing
- OpenSearch for search functionality
- Python with boto3 for AWS integration
- LinkedIn Jobs Scraper for job data collection


## Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- AWS Account with appropriate permissions
- AWS CLI configured locally
- LinkedIn account for job scraping


## Setup Instructions
1. Clone the repository:
```bash
git clone https://github.com/Jainormus/MatchMeMaybe.git
cd MatchMeMaybe
```


2. Install frontend dependencies:
```bash
npm install
```


3. Install Python dependencies:
```bash
pip install -r requirements.txt
```


4. Configure AWS credentials:
   - Set up your AWS credentials in `~/.aws/credentials`
   - Configure environment variables in `.env` file


5. Configure LinkedIn credentials:
   - Add your LinkedIn credentials to the environment variables
   - Ensure you have the necessary permissions for job scraping


6. Start the development server:
```bash
npm start
```


## Development
- Frontend runs on `http://localhost:3000`
- Backend services are deployed to AWS
- Use `npm run build` to create production build


## Project Structure
- `/src` - Frontend React application
- `/backend` - AWS Lambda functions
- `/python` - Python scripts and utilities
- `/lambda-deploy` - Lambda deployment configurations
- `/public` - Static assets


## Job Scraping
The platform uses LinkedIn Jobs Scraper to collect job data:
- Automated job listings collection
- Regular updates of job opportunities
- Data processing and storage in DynamoDB
- Integration with the matching algorithm


## Contributing
1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
