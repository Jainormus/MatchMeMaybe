import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { HeartIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  requirements: string[];
}

const JobSwipe = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Mock data - replace with actual API call
  const jobs: Job[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description: 'We are looking for a Senior Software Engineer to join our team...',
      salary: '$120k - $180k',
      requirements: ['React', 'TypeScript', 'Node.js', '5+ years experience'],
    },
    // Add more mock jobs here
  ];

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      const newDirection = info.offset.x > 0 ? 1 : -1;
      setDirection(newDirection);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % jobs.length);
        setDirection(0);
      }, 200);
    }
  };

  const currentJob = jobs[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="relative w-full max-w-md h-[600px]">
        <motion.div
          key={currentJob.id}
          className="absolute w-full h-full bg-white rounded-xl shadow-xl p-6"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          animate={{
            x: direction * 500,
            opacity: direction ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900">{currentJob.title}</h2>
            <h3 className="text-xl text-primary-600">{currentJob.company}</h3>
            <p className="text-gray-600 mt-2">{currentJob.location}</p>
            {currentJob.salary && (
              <p className="text-gray-700 font-medium mt-2">{currentJob.salary}</p>
            )}
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900">Requirements:</h4>
              <ul className="mt-2 space-y-2">
                {currentJob.requirements.map((req, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-gray-600 flex-grow">{currentJob.description}</p>
          </div>
        </motion.div>
      </div>

      <div className="flex space-x-8 mt-8">
        <button
          className="p-4 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => {
            setDirection(-1);
            setTimeout(() => {
              setCurrentIndex((prev) => (prev + 1) % jobs.length);
              setDirection(0);
            }, 200);
          }}
        >
          <XMarkIcon className="h-8 w-8 text-red-500" />
        </button>
        <button
          className="p-4 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => {
            setDirection(1);
            setTimeout(() => {
              setCurrentIndex((prev) => (prev + 1) % jobs.length);
              setDirection(0);
            }, 200);
          }}
        >
          <HeartIcon className="h-8 w-8 text-green-500" />
        </button>
      </div>
    </div>
  );
};

export default JobSwipe; 