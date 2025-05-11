// Home.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type Feature = {
  title: string;
  description: string;
  icon: string;
};

const features: Feature[] = [
  {
    title: 'Smart Job Matching',
    description:
      'Our AI-powered system matches you with jobs that align with your skills and preferences.',
    icon: '🎯',
  },
  {
    title: 'Swipe Interface',
    description:
      'Discover jobs through an intuitive swipe interface, similar to popular dating apps.',
    icon: '💼',
  },
  {
    title: 'Resume Analysis',
    description:
      'Get instant feedback on your resume and suggestions for improvement.',
    icon: '📝',
  },
  {
    title: 'Job Tracking',
    description:
      'Keep track of your job applications and interviews in one place.',
    icon: '📊',
  },
];

const Home: React.FC = () => {
  // Hide any browser scrollbars globally while this component is mounted
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      {/* Hero Section */}
      <section className="flex-shrink-0 text-center py-12 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-3xl mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Your Dream Job with a Swipe
          </h1>
          <p className="text-lg md:text-xl mb-6 max-w-xl mx-auto">
            MatchMeMaybe uses AI to help you discover and apply for jobs that
            match your skills and preferences.
          </p>
          <Link
            to="/profile"
            className="inline-block bg-white text-primary-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Swiping
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {features.map((feature, idx) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="self-start bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-2">{feature.icon}</div>
            <h3 className="text-xl font-semibold leading-tight mb-1 text-gray-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="text-base leading-snug mb-0 text-gray-600 dark:text-gray-300">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </section>

      {/* MMM Logo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex justify-center items-center mt-2"
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

export default Home;
