import { S3Client } from '@aws-sdk/client-s3';

// AWS S3 configuration
export const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // This is important for CORS
});

export const S3_BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME || '';

// Helper function to generate a unique file name
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}; 