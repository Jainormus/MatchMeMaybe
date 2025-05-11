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

    // Create the processed resume object
    const processedResume: ProcessedResume = {
      output: claudeOutput,
      metadata: {
        fileName: key.split('/').pop() || '',
        processedAt: new Date().toISOString(),
      },
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