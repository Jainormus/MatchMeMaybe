import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { uploadResumeToS3, saveProfileData } from '../services/s3Service';

interface UserProfile {
  resume: File | null;
  linkedinUrl: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    resume: null,
    linkedinUrl: '',
  });

  const [resumeName, setResumeName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfile({
        ...profile,
        resume: file,
      });
      setResumeName(file.name);
    }
  };

  const handleLinkedInChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      linkedinUrl: event.target.value,
    });
  };

  const handleSaveProfile = async () => {
    if (!profile.resume) {
      setError('Please upload your resume');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Replace with actual user ID from your auth system
      const userId = 'user123';
      
      console.log('Starting resume upload...');
      // Upload resume to S3
      const resumeUrl = await uploadResumeToS3(profile.resume, userId);
      console.log('Resume uploaded successfully:', resumeUrl);

      console.log('Saving profile data...');
      // Save profile data
      await saveProfileData({
        resumeUrl,
        linkedinUrl: profile.linkedinUrl,
        userId,
      });
      console.log('Profile data saved successfully');

      setSuccess('Profile saved successfully!');
    } catch (err) {
      console.error('Detailed error:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-8"
      >
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Resume Upload */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Resume Upload</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {resumeName || 'Click to upload your resume'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
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
            </div>
          </div>
        </section>

        {/* LinkedIn Profile */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">LinkedIn Profile (Optional)</h2>
          <div className="space-y-4">
            <div>
              <input
                type="url"
                value={profile.linkedinUrl}
                onChange={handleLinkedInChange}
                placeholder="Enter your LinkedIn profile URL"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
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
    </div>
  );
};

export default Profile; 