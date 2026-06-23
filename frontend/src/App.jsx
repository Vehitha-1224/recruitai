// # React core — needed in every component file
import React, { Suspense, lazy } from 'react';

// # BrowserRouter — enables URL-based navigation
// # Routes, Route — define which component shows for which URL
// # Navigate — redirects user to another page
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// # Our sidebar/navbar layout that wraps all pages
import Layout from './components/Layout';

// # Lazy loading — pages load only when user visits them
// # This makes initial app load much faster
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Jobs        = lazy(() => import('./pages/Jobs'));
const Candidates  = lazy(() => import('./pages/Candidates'));
const Schedule    = lazy(() => import('./pages/Schedule'));

// # A full-screen loading screen shown while a page is loading
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f5f7fa',
    flexDirection: 'column',
    gap: '16px'
  }}>
    {/* # Spinning circle animation */}
    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    <p style={{ color: '#64748b', fontSize: 14 }}>Loading...</p>
  </div>
);

// # The root component — defines all routes of the app
function App() {
  return (
    // # Router wraps everything — enables navigation to work
    <Router>
      {/* # Suspense shows PageLoader while lazy components are loading */}
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* # "/" redirects to "/dashboard" automatically */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* # Layout wraps all pages — provides sidebar + top bar */}
          <Route element={<Layout />}>

            {/* # Each nested route renders inside Layout's content area */}
            <Route path="/dashboard"  element={<Dashboard />}  />
            <Route path="/jobs"       element={<Jobs />}        />
            <Route path="/candidates" element={<Candidates />}  />
            <Route path="/schedule"   element={<Schedule />}    />

          </Route>

          {/* # Any unknown URL → redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;