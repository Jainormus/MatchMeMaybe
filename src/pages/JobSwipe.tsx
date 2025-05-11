// JobSwipe.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { HeartIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  requirements: string[];
  postedDate: string;
}

interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  savedDate: string;
  status: 'saved' | 'applied' | 'interviewing' | 'offered';
}

const JobSwipe: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [locationSearch, setLocationSearch] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [showWave, setShowWave] = useState(false);
  const [waveColor, setWaveColor] = useState<'green' | 'red'>('green');
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const lastSwipeTime = useRef<number>(0);
  const accumulatedDelta = useRef<number>(0);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  const jobs: Job[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description: 'We are looking for a Senior Software Engineer to join our team and help build scalable applications. You will be responsible for designing and implementing new features, mentoring junior developers, and contributing to architectural decisions.',
      salary: '$120k - $180k',
      requirements: ['React', 'TypeScript', 'Node.js', '5+ years experience'],
      postedDate: new Date().toISOString().split('T')[0],
    },
    {
      id: '2',
      title: 'Frontend Developer',
      company: 'DesignHub',
      location: 'Remote',
      description: 'Join our creative team as a Frontend Developer! We\'re looking for someone passionate about creating beautiful, responsive user interfaces and exceptional user experiences. You\'ll work closely with our design team to bring mockups to life.',
      salary: '$90k - $130k',
      requirements: ['Vue.js', 'CSS/SCSS', 'UI/UX Design', '3+ years experience'],
      postedDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '3',
      title: 'DevOps Engineer',
      company: 'CloudScale',
      location: 'New York, NY',
      description: 'Help us build and maintain our cloud infrastructure! We need a DevOps Engineer to automate our deployment processes, manage our AWS infrastructure, and ensure our systems are secure and scalable.',
      salary: '$130k - $160k',
      requirements: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', '4+ years experience'],
      postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '4',
      title: 'Mobile App Developer',
      company: 'AppWorks',
      location: 'Austin, TX',
      description: 'Looking for a Mobile App Developer to join our fast-growing team. You\'ll be developing cross-platform mobile applications using React Native and working on both iOS and Android platforms.',
      salary: '$100k - $140k',
      requirements: ['React Native', 'JavaScript', 'Mobile Development', '2+ years experience'],
      postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '5',
      title: 'Backend Developer',
      company: 'DataFlow',
      location: 'Seattle, WA',
      description: 'We\'re seeking a Backend Developer to help build our data processing pipeline. You\'ll be working with large datasets, implementing efficient algorithms, and ensuring our systems can handle high traffic.',
      salary: '$110k - $150k',
      requirements: ['Python', 'SQL', 'REST APIs', 'Data Processing', '3+ years experience'],
      postedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '6',
      title: 'Full Stack Developer',
      company: 'StartupX',
      location: 'Remote',
      description: 'Join our early-stage startup as a Full Stack Developer! You\'ll be working on both frontend and backend, helping to build our product from the ground up. This is a great opportunity to wear many hats and make a big impact.',
      salary: '$95k - $135k',
      requirements: ['JavaScript', 'Node.js', 'React', 'MongoDB', '2+ years experience'],
      postedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '7',
      title: 'AI/ML Engineer',
      company: 'AI Solutions',
      location: 'Boston, MA',
      description: 'Help us build the next generation of AI-powered applications! We\'re looking for an AI/ML Engineer to develop and implement machine learning models, work with large datasets, and integrate AI solutions into our products.',
      salary: '$140k - $190k',
      requirements: ['Python', 'TensorFlow', 'Machine Learning', 'Data Science', '4+ years experience'],
      postedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      id: '8',
      title: 'Security Engineer',
      company: 'SecureTech',
      location: 'Washington, DC',
      description: 'Join our security team to help protect our systems and data. You\'ll be responsible for implementing security measures, conducting security audits, and responding to security incidents.',
      salary: '$130k - $170k',
      requirements: ['Security', 'Network Security', 'Penetration Testing', '5+ years experience'],
      postedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ];

  const locations = ['all', ...jobs.map(job => job.location).filter((loc, i, arr) => arr.indexOf(loc) === i)];

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredJobs = jobs.filter(job => {
    const locMatch = locationFilter === 'all' || job.location === locationFilter;
    const now = Date.now();
    const postedTime = new Date(job.postedDate).getTime();
    const dateMatch =
      dateFilter === 'all' ||
      (dateFilter === '24h' && now - postedTime <= 24 * 60 * 60 * 1000) ||
      (dateFilter === '7d' && now - postedTime <= 7 * 24 * 60 * 60 * 1000) ||
      (dateFilter === '30d' && now - postedTime <= 30 * 24 * 60 * 60 * 1000);
    return locMatch && dateMatch;
  });

  const moveToNextJob = () => {
    if (currentIndex < filteredJobs.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setHasMoreJobs(false);
    }
  };

  useEffect(() => {
    setCurrentIndex(0);
    setHasMoreJobs(filteredJobs.length > 0);
  }, [locationFilter, dateFilter, filteredJobs.length]);

  const handleSwipeRight = () => {
    setWaveColor('green');
    setShowWave(true);
    const job = filteredJobs[currentIndex];
    const stored = localStorage.getItem('savedJobs');
    const saved: SavedJob[] = stored ? JSON.parse(stored) : [];
    if (!saved.some(j => j.id === job.id)) {
      saved.push({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        savedDate: new Date().toISOString(),
        status: 'saved',
      });
      localStorage.setItem('savedJobs', JSON.stringify(saved));
    }
    setDirection(1);
    setTimeout(() => {
      moveToNextJob();
      setDirection(0);
      setShowWave(false);
    }, 200);
  };

  const handleWheel = (e: Event) => {
    const wheelEvent = e as WheelEvent;
    const now = Date.now();
    
    if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {
      e.preventDefault();
      
      if (now - lastSwipeTime.current < 2000) {
        return;
      }

      if (currentIndex >= filteredJobs.length - 1) {
        return;
      }

      accumulatedDelta.current += wheelEvent.deltaX;
      
      if (Math.abs(accumulatedDelta.current) > 50) {
        const dir = accumulatedDelta.current > 0 ? -1 : 1;
        setDirection(dir);
        setWaveColor(dir > 0 ? 'green' : 'red');
        setShowWave(true);
        lastSwipeTime.current = now;
        accumulatedDelta.current = 0;
        
        if (dir > 0) handleSwipeRight();
        else {
          setTimeout(() => {
            moveToNextJob();
            setDirection(0);
            setShowWave(false);
          }, 200);
        }
      }
    }
  };

  useEffect(() => {
    const resetTimer = setInterval(() => {
      accumulatedDelta.current = 0;
    }, 500);

    return () => clearInterval(resetTimer);
  }, []);

  useEffect(() => {
    const element = document.querySelector('.swipe-container');
    if (element) {
      element.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        element.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      const dir = info.offset.x > 0 ? 1 : -1;
      setDirection(dir);
      setWaveColor(dir > 0 ? 'green' : 'red');
      setShowWave(true);
      if (dir > 0) handleSwipeRight();
      else {
        setTimeout(() => {
          moveToNextJob();
          setDirection(0);
          setShowWave(false);
        }, 200);
      }
    } else {
      setDirection(0);
    }
  };

  if (!hasMoreJobs || filteredJobs.length === 0 || currentIndex >= filteredJobs.length) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ height: 'calc(100vh - 4rem)', overflow: 'hidden' }}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {filteredJobs.length === 0 ? 'No Matching Jobs Found' : 'No More Jobs to Show'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {filteredJobs.length === 0
            ? 'Try adjusting your filters or check back later for new opportunities.'
            : "You've gone through all available jobs. Check back later for new opportunities!"}
        </p>
        <div className="space-x-4">
          <Link
            to="/saved"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            View Saved Jobs
          </Link>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setHasMoreJobs(true);
              setLocationFilter('all');
              setDateFilter('all');
            }}
            className="inline-block px-6 py-3 border-2 border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-800 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const currentJob = filteredJobs[currentIndex];

  return (
    <div
      className="flex flex-col items-center swipe-container"
      style={{ height: 'calc(100vh - 4rem)', overflow: 'hidden' }}
    >
      <div className="w-full max-w-md mb-1 flex gap-4 relative z-50">
        <div className="flex-1 relative" ref={locationDropdownRef}>
          <button
            onClick={() => setIsLocationDropdownOpen(o => !o)}
            className="w-full px-3 py-1 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-left flex items-center justify-between bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <span>{locationFilter === 'all' ? 'All Locations' : locationFilter}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isLocationDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-1">
                <input
                  type="text"
                  value={locationSearch}
                  onChange={e => setLocationSearch(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full px-3 py-1 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocationFilter(loc);
                        setIsLocationDropdownOpen(false);
                        setLocationSearch('');
                      }}
                      className="w-full px-3 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {loc === 'all' ? 'All Locations' : loc}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-1 text-gray-500 dark:text-gray-400">No locations found</div>
                )}
              </div>
            </div>
          )}
        </div>
        <select
          className="px-3 py-1 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        >
          <option value="all">Any Time</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
        {filteredJobs.length - currentIndex} {filteredJobs.length - currentIndex === 1 ? 'job' : 'jobs'} remaining
      </div>

      <div className="relative w-full max-w-4xl flex items-center justify-center">
        <button
          className="absolute left-0 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg hover:shadow-xl backdrop-blur-sm"
          onClick={() => {
            setWaveColor('red');
            setShowWave(true);
            setDirection(-1);
            setTimeout(() => {
              moveToNextJob();
              setDirection(0);
              setShowWave(false);
            }, 200);
          }}
        >
          <XMarkIcon className="h-7 w-7 text-red-500" />
        </button>
        <motion.div
          key={currentJob.id}
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * 500, opacity: 0 }}
          transition={{ duration: 0.2 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mx-16 relative z-10"
        >
          <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentJob.title}</h2>
            <h3 className="text-xl text-primary-600 dark:text-primary-400">{currentJob.company}</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{currentJob.location}</p>
            {currentJob.salary && (
              <p className="text-gray-700 dark:text-gray-200 font-medium mt-1">{currentJob.salary}</p>
            )}
            <div className="mt-3">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Requirements:</h4>
              <ul className="mt-2 space-y-1">
                {currentJob.requirements.map((req, i) => (
                  <li key={i} className="flex items-center text-gray-600 dark:text-gray-300">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-300 flex-grow line-clamp-4">
              {currentJob.description}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Posted on {new Date(currentJob.postedDate).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
        <button
          className="absolute right-0 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg hover:shadow-xl backdrop-blur-sm"
          onClick={handleSwipeRight}
        >
          <HeartIcon className="h-7 w-7 text-green-500" />
        </button>

        {showWave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 pointer-events-none"
            style={{
              background: waveColor === 'green' 
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.2)'
            }}
          />
        )}
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
        Swipe right to save, left to skip
      </div>
    </div>
  );
};

export default JobSwipe;
