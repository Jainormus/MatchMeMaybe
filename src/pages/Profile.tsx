import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { uploadResumeToS3, saveProfileData, getProfileData } from '../services/s3Service';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  resume: File | null;
  linkedinUrl: string;
  resumeName: string;
  originalResumeName: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({
    resume: null,
    linkedinUrl: '',
    resumeName: '',
    originalResumeName: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // TODO: Replace with actual user ID from your auth system
        const userId = 'user123';
        const savedProfile = await getProfileData(userId);
        
        if (savedProfile) {
          setProfile(prev => ({
            ...prev,
            linkedinUrl: savedProfile.linkedinUrl,
            resumeName: savedProfile.resumeUrl.split('/').pop() || '',
            originalResumeName: savedProfile.originalResumeName || savedProfile.resumeUrl.split('/').pop() || '',
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfile({
        ...profile,
        resume: file,
        resumeName: file.name,
        originalResumeName: file.name,
      });
    }
  };

  const handleLinkedInChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      linkedinUrl: event.target.value,
    });
  };

  const checkJobProcessingStatus = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/jobs_status`);
      const data = await response.json();
      console.log(data);
      
      if (data.status === 'completed') {
        setIsProcessing(false);
        setProcessingStatus('');
        navigate('/swipe');
      } else if (data.status === 'processing') {
        setProcessingStatus(data.message || 'Processing your resume and finding matching jobs...');
        // Check again after 5 seconds
        setTimeout(() => checkJobProcessingStatus(), 5000);
      } else {
        throw new Error('Unknown processing status');
      }
    } catch (err) {
      console.error('Error checking job processing status:', err);
      setError('Failed to check job processing status. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.resume && !profile.resumeName) {
      setError('Please upload your resume');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Replace with actual user ID from your auth system
      const userId = 'user123';
      
      let resumeUrl = '';
      if (profile.resume) {
        console.log('Starting resume upload...');
        resumeUrl = await uploadResumeToS3(profile.resume, userId);
        console.log('Resume uploaded successfully:', resumeUrl);
      }

      console.log('Saving profile data...');
      await saveProfileData({
        resumeUrl: resumeUrl || profile.resumeName,
        linkedinUrl: profile.linkedinUrl,
        userId,
        originalResumeName: profile.originalResumeName,
      });
      console.log('Profile data saved successfully');

      setSuccess('Profile saved successfully! Starting job processing...');
      setIsProcessing(true);
      setProcessingStatus('Processing your resume and finding matching jobs...');
      
      // Start checking job processing status
      checkJobProcessingStatus();
    } catch (err) {
      console.error('Detailed error:', err);
      setError('Failed to save profile. Please try again.');
      setIsProcessing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10"
      >
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Profile</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/50 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded">
            {success}
          </div>
        )}

        {isProcessing && (
          <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900/50 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p>{processingStatus}</p>
            </div>
          </div>
        )}

        {/* Resume Upload */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Resume Upload</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {profile.originalResumeName || 'Click to upload your resume'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Supported formats: PDF, DOC, DOCX
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    className="hidden"
                  />
                </div>
              </label>
              {profile.originalResumeName && (
                <button
                  onClick={() => setProfile(prev => ({ 
                    ...prev, 
                    resume: null, 
                    resumeName: '', 
                    originalResumeName: '' 
                  }))}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Remove resume"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* LinkedIn Profile */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">LinkedIn Profile (Optional)</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="url"
                value={profile.linkedinUrl}
                onChange={handleLinkedInChange}
                placeholder="Enter your LinkedIn profile URL"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {profile.linkedinUrl && (
                <button
                  onClick={() => setProfile(prev => ({ ...prev, linkedinUrl: '' }))}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Clear LinkedIn URL"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className={`px-6 py-3 bg-primary-600 text-white rounded-lg transition-colors ${
              isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </motion.div>

      {/* MMM Logo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex justify-center items-center mt-12"
      >
        <div className="text-4xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent flex items-center gap-2">
          <span className="text-primary-500">❤️</span>
          MMM
          <span className="text-primary-500">❤️</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile; 