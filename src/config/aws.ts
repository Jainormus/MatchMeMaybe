import { S3Client } from '@aws-sdk/client-s3';

// AWS S3 configuration
export const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // This is important for CORS
});

export const S3_BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME || '';

// Helper function to generate a unique file name while preserving the original name
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
  
  // Replace spaces and special characters with hyphens
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-');
  
  // Combine timestamp, random string, and original name
  return `${sanitizedName}-${timestamp}-${randomString}.${extension}`;
}; 