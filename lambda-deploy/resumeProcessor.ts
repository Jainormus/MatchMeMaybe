import { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand, Block } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Event } from 'aws-lambda';

const textractClient = new TextractClient({});
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-west-2'  // Make sure this matches your region
});
const s3Client = new S3Client({});

interface ResumeSection {
  section: string;
  content: string;
}

interface ProcessedResume {
  output: any;  // This will store the raw JSON from Claude
  metadata: {
    fileName: string;
    processedAt: string;
  };
  searchQueries?: Array<{
    query: string;
    locations: string[];
    limit: number;
  }>;
}

async function extractTextFromPDF(bucket: string, key: string): Promise<string> {
  // Start the document analysis
  const startCommand = new StartDocumentAnalysisCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    FeatureTypes: ['FORMS', 'TABLES'],
  });

  const { JobId } = await textractClient.send(startCommand);

  // Poll for completion
  let jobStatus = 'IN_PROGRESS';
  let extractedText = '';

  while (jobStatus === 'IN_PROGRESS') {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls

    const getCommand = new GetDocumentAnalysisCommand({ JobId });
    const response = await textractClient.send(getCommand);
    jobStatus = response.JobStatus || 'IN_PROGRESS';

    if (response.Blocks) {
      extractedText += response.Blocks
        .filter((block: Block) => block.BlockType === 'LINE')
        .map((block: Block) => block.Text)
        .join('\n');
    }
  }

  return extractedText;
}

async function extractResumeSections(text: string): Promise<any> {
  const prompt = `You are a resume parser, and your output must be in JSON format. 
  The JSON should be an array of objects, each representing a section of the resume.
  Each object should have a "section" property that indicates the section name, and a "content" property that contains the content of the section.
 
  ${text}`;

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      top_k: 250,
      stop_sequences: [],
      temperature: 0.1,
      top_p: 0.999,
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: prompt
        }]
      }]
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Log the entire response for debugging
  console.log('Full response from Claude:', JSON.stringify(responseBody, null, 2));
  
  return JSON.parse(responseBody.content[0].text);
}

async function generateSearchQuery(resumeSections: any): Promise<any[]> {
  const MAX_RETRIES = 5;
  const BASE_DELAY = 5000; // 5 seconds in milliseconds
  const MAX_DELAY = 30000; // 30 seconds maximum delay

  // Default search queries as fallback
  const defaultQueries = [
    {
      query: "Jobs",
      locations: ["United States"],
      limit: 30
    }
  ];

  const prompt = `Based on the following resume sections, generate 3 different LinkedIn job search queries.
  Each query should be relevant to the person's experience, skills, and career goals, but focus on different aspects or career paths.
  For example, if someone has experience in both software development and data science, you might suggest:
  1. A primary role they're most qualified for
  2. A related role that leverages their skills
  3. An aspirational role they could grow into

  Return ONLY a JSON array of 3 objects, nothing else, each with the following structure:
  {
    "query": "string (e.g., 'Software Engineer' or 'English Teacher')",
    "locations": ["array of preferred locations"],
    "limit": number (always 30)
  }

  Resume sections:
  ${JSON.stringify(resumeSections, null, 2)}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} of ${MAX_RETRIES} to generate search queries...`);
      
      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          top_k: 250,
          stop_sequences: [],
          temperature: 0.1,
          top_p: 0.999,
          messages: [{
            role: "user",
            content: [{
              type: "text",
              text: prompt
            }]
          }]
        }),
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Log the response for debugging
      console.log('Search query response:', JSON.stringify(responseBody, null, 2));
      
      // Extract the text content from Claude's response
      const content = responseBody.content[0].text;
      
      // Find the JSON array in the response
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('Could not find JSON array in response:', content);
        throw new Error('Invalid response format from Claude');
      }
      
      const jsonStr = content.slice(jsonStart, jsonEnd);
      const queries = JSON.parse(jsonStr);
      
      // Validate the queries
      if (!Array.isArray(queries) || queries.length !== 3) {
        throw new Error('Invalid number of queries returned');
      }
      
      return queries;

    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === MAX_RETRIES - 1) {
        console.log('All retry attempts failed. Using default search queries.');
        return defaultQueries;
      }

      // Check if it's a throttling error
      if (error.name === 'ThrottlingException') {
        // Calculate delay with exponential backoff and jitter, capped at MAX_DELAY
        const exponentialDelay = BASE_DELAY * Math.pow(2, attempt);
        const jitter = Math.random() * 2000; // 0-2 seconds of jitter
        const delay = Math.min(exponentialDelay + jitter, MAX_DELAY);
        
        console.log(`Throttling detected. Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // For other errors, use a shorter delay
        const delay = Math.min(BASE_DELAY * (attempt + 1), MAX_DELAY);
        console.log(`Error occurred. Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.log('Using default search queries after all retries failed');
  return defaultQueries;
}

export const handler = async (event: S3Event): Promise<void> => {
  try {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    // Only process files in the resumes folder
    if (!key.startsWith('resumes/')) {
      console.log('Skipping non-resume file:', key);
      return;
    }

    console.log('Processing resume:', key);

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(bucket, key);
    console.log('Text extracted successfully');

    // Extract resume sections using Bedrock
    const claudeOutput = await extractResumeSections(extractedText);
    console.log('Sections extracted successfully');

    // Generate search queries based on resume
    const searchQueries = await generateSearchQuery(claudeOutput);
    console.log('Search queries generated:', searchQueries);

    // Create the processed resume object
    const processedResume: ProcessedResume = {
      output: claudeOutput,
      metadata: {
        fileName: key.split('/').pop() || '',
        processedAt: new Date().toISOString(),
      },
      searchQueries: searchQueries
    };

    // Save the processed resume to S3
    const processedKey = key.replace('resumes/', 'processed-resumes/').replace(/\.[^/.]+$/, '.json');
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: processedKey,
      Body: JSON.stringify(processedResume, null, 2),
      ContentType: 'application/json',
    }));

    console.log('Processed resume saved to:', processedKey);
  } catch (error) {
    console.error('Error processing resume:', error);
    throw error;
  }
}; 