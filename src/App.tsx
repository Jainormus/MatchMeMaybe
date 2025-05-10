import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import JobSwipe from './pages/JobSwipe';
import JobDetails from './pages/JobDetails';
import Profile from './pages/Profile';
import SavedJobs from './pages/SavedJobs';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/swipe" element={<JobSwipe />} />
            <Route path="/job/:id" element={<JobDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/saved" element={<SavedJobs />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 