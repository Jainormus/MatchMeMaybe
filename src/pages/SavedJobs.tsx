import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HeartIcon, MapPinIcon, CurrencyDollarIcon, TrashIcon } from '@heroicons/react/24/outline';
import Confetti from 'react-confetti';

interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  savedDate: string;
  status: 'saved' | 'applied' | 'interviewing' | 'offered';
}

// Initial mock data
const initialSavedJobs: SavedJob[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      salary: '$120k - $180k',
      savedDate: '2024-02-20',
      status: 'saved',
    },
    {
      id: '2',
      title: 'Full Stack Developer',
      company: 'StartupX',
      location: 'Remote',
      salary: '$90k - $130k',
      savedDate: '2024-02-19',
      status: 'applied',
    },
];

const SavedJobs = () => {
  // Initialize state with data from localStorage or initial mock data
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() => {
    const savedJobsFromStorage = localStorage.getItem('savedJobs');
    return savedJobsFromStorage ? JSON.parse(savedJobsFromStorage) : initialSavedJobs;
  });

  // Add status filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Add sort order state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiJobId, setConfettiJobId] = useState<string | null>(null);
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 });

  // Save to localStorage whenever savedJobs changes
  useEffect(() => {
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  }, [savedJobs]);

  const handleDeleteJob = (jobId: string) => {
    setSavedJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
  };

  // Filter jobs based on selected status
  const filteredJobs = savedJobs.filter(job => 
    statusFilter === 'all' ? true : job.status === statusFilter
  );

  // Sort jobs based on savedDate
  const sortedAndFilteredJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.savedDate).getTime();
    const dateB = new Date(b.savedDate).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const getStatusColor = (status: SavedJob['status']) => {
    switch (status) {
      case 'saved':
        return 'bg-blue-100 text-blue-800';
      case 'applied':
        return 'bg-yellow-100 text-yellow-800';
      case 'interviewing':
        return 'bg-purple-100 text-purple-800';
      case 'offered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = (jobId: string, newStatus: SavedJob['status'], event: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedJobs = savedJobs.map(job => {
      if (job.id === jobId) {
        const oldStatus = job.status;
        const updatedJob = { ...job, status: newStatus };
        
        // Trigger pop effect if status changes to "offered"
        if (newStatus === 'offered' && oldStatus !== 'offered') {
          const rect = event.target.getBoundingClientRect();
          const x = rect.left + (rect.width / 2);
          const y = rect.top;
          setConfettiPosition({ x, y });
          setShowConfetti(true);
          setConfettiJobId(jobId);
        }
        
        return updatedJob;
      }
      return job;
    });
    
    setSavedJobs(updatedJobs);
    localStorage.setItem('savedJobs', JSON.stringify(updatedJobs));
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={50}
            gravity={0.3}
            initialVelocityX={15}
            initialVelocityY={30}
            confettiSource={{
              x: confettiPosition.x,
              y: confettiPosition.y,
              w: 5,
              h: 5
            }}
            style={{ position: 'fixed', top: 0, left: 0 }}
            colors={['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#FF4500']}
            onConfettiComplete={() => {
              setShowConfetti(false);
              setConfettiJobId(null);
            }}
          />
          <div 
            className="absolute w-8 h-8 rounded-full bg-yellow-400 animate-pop"
            style={{
              left: confettiPosition.x - 16,
              top: confettiPosition.y - 16,
              animation: 'pop 0.5s ease-out forwards'
            }}
          />
        </div>
      )}

      <style>
        {`
          @keyframes pop {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            20% {
              transform: scale(1.2);
              opacity: 0.8;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }
        `}
      </style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Saved Jobs</h1>
          <div className="flex gap-4">
            <select 
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Any Status</option>
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offered">Offered</option>
            </select>
            <select 
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <Link
            to="/swipe"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Find More Jobs
          </Link>
        </div>

        <div className="grid gap-6">
          {sortedAndFilteredJobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <Link
                    to={`/job/${job.id}`}
                    className="text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600"
                  >
                    {job.title}
                  </Link>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">{job.company}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value as SavedJob['status'], e)}
                    className={`px-3 py-1 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${getStatusColor(job.status)}`}
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offered">Offered</option>
                  </select>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                    aria-label="Delete job"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">
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
                  <HeartIcon className="h-5 w-5 mr-1" />
                  Saved on {new Date(job.savedDate).toLocaleDateString()}
                </div>
              </div>

              {job.status === 'saved' && (
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => handleStatusChange(job.id, 'applied', { target: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 0 }) } } as React.ChangeEvent<HTMLSelectElement>)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {savedJobs.length === 0 && (
          <div className="text-center py-12">
            <HeartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No saved jobs yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start swiping to find and save jobs that match your preferences.
            </p>
            <Link
              to="/swipe"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Start Swiping
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SavedJobs; 