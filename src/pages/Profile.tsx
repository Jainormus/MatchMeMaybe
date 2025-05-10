import React, { useState } from 'react';
import { motion } from 'framer-motion';

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

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-8"
      >
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

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
            onClick={() => {
              // Handle profile save
              console.log('Saving profile:', profile);
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile; 