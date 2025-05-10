import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Smart Job Matching',
    description: 'Our AI-powered system matches you with jobs that align with your skills and preferences.',
    icon: '🎯',
  },
  {
    title: 'Swipe Interface',
    description: 'Discover jobs through an intuitive swipe interface, similar to popular dating apps.',
    icon: '💼',
  },
  {
    title: 'Resume Analysis',
    description: 'Get instant feedback on your resume and suggestions for improvement.',
    icon: '📝',
  },
  {
    title: 'Job Tracking',
    description: 'Keep track of your job applications and interviews in one place.',
    icon: '📊',
  },
];

const Home = () => {
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold mb-6">
            Find Your Dream Job with a Swipe
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            MatchMeMaybe uses AI to help you discover and apply for jobs that match your skills and preferences.
          </p>
          <Link
            to="/swipe"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Swiping
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </motion.div>
        ))}
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 bg-gray-50 rounded-3xl">
        <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Opportunity?</h2>
        <p className="text-gray-600 mb-8">
          Join thousands of job seekers who have found their dream jobs through MatchMeMaybe.
        </p>
        <div className="space-x-4">
          <Link
            to="/swipe"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-primary-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            to="/profile"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-full font-semibold border-2 border-primary-600 hover:bg-primary-50 transition-colors"
          >
            Create Profile
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home; 