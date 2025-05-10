import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME, generateUniqueFileName } from '../config/aws';

export interface ProfileData {
  resumeUrl: string;
  linkedinUrl: string;
  userId: string;
  originalResumeName: string;
}

export const uploadResumeToS3 = async (file: File, userId: string): Promise<string> => {
  try {
    const uniqueFileName = generateUniqueFileName(file.name);
    const key = `resumes/${userId}/${uniqueFileName}`;

    // Convert File to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: uint8Array,
      ContentType: file.type,
    });

    await s3Client.send(command);
    
    // Return the S3 URL for the uploaded file using path-style URL
    return `https://s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${S3_BUCKET_NAME}/${key}`;
  } catch (error) {
    console.error('Error uploading resume to S3:', error);
    throw new Error('Failed to upload resume');
  }
};

export const saveProfileData = async (profileData: ProfileData): Promise<void> => {
  try {
    const key = `profiles/${profileData.userId}/profile.json`;
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(profileData),
      ContentType: 'application/json',
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error saving profile data to S3:', error);
    throw new Error('Failed to save profile data');
  }
};

export const getProfileData = async (userId: string): Promise<ProfileData | null> => {
  try {
    const key = `profiles/${userId}/profile.json`;
    
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const profileData = await response.Body?.transformToString();
    
    return profileData ? JSON.parse(profileData) : null;
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return null;
  }
}; 