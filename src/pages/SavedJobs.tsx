import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HeartIcon, MapPinIcon, ChartBarIcon, TrashIcon } from '@heroicons/react/24/outline';
import Confetti from 'react-confetti';

interface SavedJob {
  job_id: string;
  title: string;
  company: string;
  place: string;
  link: string;
  match_percentage?: number;
  saved_date: string;
  status: 'saved' | 'applied' | 'interviewing' | 'offered';
  key_requirements?: string[];
  key_descriptions?: string[];
}

const SavedJobs = () => {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiJobId, setConfettiJobId] = useState<string | null>(null);
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/saved-jobs');
        if (!response.ok) {
          throw new Error('Failed to fetch saved jobs');
        }
        const data = await response.json();
        // Ensure every job has a status, default to 'saved' if missing
        const jobsWithStatus = data.map((job: any) => ({
          ...job,
          status: job.status || 'saved',
        }));
        setSavedJobs(jobsWithStatus);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    fetchSavedJobs();
  }, []);

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/saved-jobs/${jobId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete job');
      }
      
      setSavedJobs(prevJobs => prevJobs.filter(job => job.job_id !== jobId));
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: SavedJob['status'], event: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      const response = await fetch(`http://localhost:8000/api/saved-jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job status');
      }

      const updatedJobs = savedJobs.map(job => {
        if (job.job_id === jobId) {
          const oldStatus = job.status;
          const updatedJob = { ...job, status: newStatus };
          
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
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  // Filter jobs based on selected status
  const filteredJobs = savedJobs.filter(job => 
    statusFilter === 'all' ? true : job.status === statusFilter
  );

  // Sort jobs based on saved_date
  const sortedAndFilteredJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.saved_date).getTime();
    const dateB = new Date(b.saved_date).getTime();
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

          .firework-container {
            position: fixed;
            width: 0;
            height: 0;
            pointer-events: none;
            z-index: 99999;
          }

          .firework-rocket {
            position: absolute;
            width: 4px;
            height: 20px;
            background: linear-gradient(to top, #ff4500, #ff0);
            border-radius: 2px;
            animation: shoot 1s ease-out forwards;
            box-shadow: 0 0 10px #ff0;
          }

          .firework-particle {
            position: absolute;
            width: var(--size);
            height: var(--size);
            border-radius: 50%;
            background: radial-gradient(circle at center,
              #ff0 0%,
              #ff4500 50%,
              transparent 100%
            );
            animation: explode 2.5s ease-out forwards;
            animation-delay: var(--delay);
            box-shadow: 0 0 10px #ff0, 0 0 20px #ff4500;
          }

          .firework-particle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: var(--trail-length);
            height: 2px;
            background: linear-gradient(to right, #ff0, transparent);
            transform-origin: left center;
            transform: rotate(var(--angle));
            opacity: 0.5;
          }

          @keyframes shoot {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(calc(-1 * var(--peak-height))) rotate(0deg);
              opacity: 0;
            }
          }

          @keyframes explode {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 1;
            }
            20% {
              transform: 
                rotate(var(--angle))
                translate(25vw, 0)
                scale(1.2);
              opacity: 1;
            }
            100% {
              transform: 
                rotate(var(--angle))
                translate(50vw, 25vh)
                scale(0);
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
              key={job.job_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600"
                  >
                    {job.title}
                  </a>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">{job.company}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.job_id, e.target.value as SavedJob['status'], e)}
                    className={`px-3 py-1 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${getStatusColor(job.status)}`}
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offered">Offered</option>
                  </select>
                  <button
                    onClick={() => handleDeleteJob(job.job_id)}
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
                  {job.place}
                </div>
                {job.match_percentage && (
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-1" />
                    {Math.round(job.match_percentage)}% Match
                  </div>
                )}
                <div className="flex items-center">
                  <HeartIcon className="h-5 w-5 mr-1" />
                  Saved on {new Date(job.saved_date).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-6">
                {job.key_requirements && job.key_requirements.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Requirements:</h4>
                    <ul className="space-y-2">
                      {job.key_requirements.map((req, i) => (
                        <li key={i} className="flex items-start text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {job.key_descriptions && job.key_descriptions.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description:</h4>
                    <ul className="space-y-2">
                      {job.key_descriptions.map((desc, i) => (
                        <li key={i} className="flex items-start text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {job.status === 'saved' && (
                <div className="mt-6 flex justify-end">
                  <a 
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply Now
                  </a>
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