import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface JobDetails {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  postedDate: string;
  description: string;
  requirements: string[];
  benefits: string[];
  companyInfo: {
    name: string;
    description: string;
    website?: string;
    size?: string;
    industry?: string;
  };
}

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();

  // Mock data - replace with actual API call
  const job: JobDetails = {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    salary: '$120k - $180k',
    type: 'Full-time',
    postedDate: '2024-02-20',
    description: `We are looking for a Senior Software Engineer to join our team and help build the next generation of our platform. You will be responsible for designing and implementing scalable solutions, mentoring junior developers, and collaborating with cross-functional teams.

Key responsibilities include:
- Designing and implementing new features
- Optimizing application performance
- Writing clean, maintainable code
- Participating in code reviews
- Mentoring junior developers`,
    requirements: [
      '5+ years of experience in software development',
      'Strong proficiency in React and TypeScript',
      'Experience with Node.js and Express',
      'Knowledge of AWS services',
      'Excellent problem-solving skills',
      'Strong communication and collaboration abilities',
    ],
    benefits: [
      'Competitive salary and equity',
      'Health, dental, and vision insurance',
      '401(k) matching',
      'Flexible work hours',
      'Remote work options',
      'Professional development budget',
    ],
    companyInfo: {
      name: 'Tech Corp',
      description: 'Tech Corp is a leading technology company focused on building innovative solutions for businesses worldwide.',
      website: 'https://techcorp.example.com',
      size: '100-500 employees',
      industry: 'Technology',
    },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Job Header */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-gray-600">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-1" />
              {job.company}
            </div>
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 mr-1" />
              {job.location}
            </div>
            {job.salary && (
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-1" />
                {job.salary}
              </div>
            )}
            <div className="flex items-center">
              <BriefcaseIcon className="h-5 w-5 mr-1" />
              {job.type}
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 mr-1" />
              Posted {new Date(job.postedDate).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Job Description</h2>
          <div className="prose max-w-none">
            <p className="whitespace-pre-line">{job.description}</p>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Requirements</h2>
          <ul className="space-y-2">
            {job.requirements.map((req, index) => (
              <li key={index} className="flex items-start">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2"></span>
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Benefits</h2>
          <ul className="space-y-2">
            {job.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start">
                <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2"></span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">About {job.companyInfo.name}</h2>
          <p className="text-gray-600 mb-4">{job.companyInfo.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {job.companyInfo.size && (
              <div>
                <span className="font-medium">Company Size:</span> {job.companyInfo.size}
              </div>
            )}
            {job.companyInfo.industry && (
              <div>
                <span className="font-medium">Industry:</span> {job.companyInfo.industry}
              </div>
            )}
            {job.companyInfo.website && (
              <div className="col-span-2">
                <span className="font-medium">Website:</span>{' '}
                <a
                  href={job.companyInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700"
                >
                  {job.companyInfo.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button className="px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
            Save Job
          </button>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Apply Now
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default JobDetails; 