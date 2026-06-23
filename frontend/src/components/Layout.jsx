// # React core
import React, { useState } from 'react';

// # Outlet renders whichever child page is active (Dashboard, Jobs etc.)
// # useLocation tells us which URL we are currently on
import { Outlet, useLocation, NavLink } from 'react-router-dom';

// # Icons from lucide-react — clean SVG icons
import {
  LayoutDashboard,  // # Dashboard icon
  Briefcase,        // # Jobs icon
  Users,            // # Candidates icon
  Calendar,         // # Schedule icon
  Menu,             // # Hamburger menu icon
  X,                // # Close icon
  Bot,              // # AI robot icon for logo
} from 'lucide-react';

// # Component-specific styles
import './Layout.css';

// ─── NAVIGATION LINKS CONFIG ─────────────────────────────────────
// # Define all sidebar links in one array
// # Easy to add new pages later — just add one object here
const NAV_LINKS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,   // # Icon component
  },
  {
    to: '/jobs',
    label: 'Jobs',
    icon: Briefcase,
  },
  {
    to: '/candidates',
    label: 'Candidates',
    icon: Users,
  },
  {
    to: '/schedule',
    label: 'Schedule',
    icon: Calendar,
  },
];

// ─── MAIN LAYOUT COMPONENT ───────────────────────────────────────
function Layout() {
  // # Controls whether sidebar is open on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // # Get current URL path — used to show page title in topbar
  const location = useLocation();

  // # Derive page title from current URL
  // # '/dashboard' → 'Dashboard', '/jobs' → 'Jobs' etc.
  const currentPage = NAV_LINKS.find(
    link => location.pathname.startsWith(link.to)
  );
  const pageTitle = currentPage?.label || 'RecruitAI';

  // # Close sidebar when a link is clicked on mobile
  const handleNavClick = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  return (
    <div className="layout">

      {/* ── SIDEBAR OVERLAY (mobile only) ──────────────────────
          # Dark background behind sidebar on mobile
          # Clicking it closes the sidebar                       */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ────────────────────────────────────────────
          # Left panel with logo and navigation links           */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>

        {/* # Logo area at top of sidebar */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <Bot size={22} color="white" />
          </div>
          <div>
            <p className="sidebar__logo-title">RecruitAI</p>
            <p className="sidebar__logo-sub">Smart Hiring Platform</p>
          </div>
        </div>

        {/* # Navigation section label */}
        <p className="sidebar__section-label">MAIN MENU</p>

        {/* # Navigation links — loop through NAV_LINKS array */}
        <nav className="sidebar__nav">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              // # NavLink automatically adds 'active' class
              // # when the URL matches — we use it for highlighting
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              {/* # Icon on the left */}
              <Icon size={18} />
              {/* # Link text */}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* # Version tag at bottom of sidebar */}
        <div className="sidebar__footer">
          <p>Version 1.0.0</p>
          <p>AI-Powered ATS</p>
        </div>

      </aside>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────
          # Everything to the right of the sidebar             */}
      <div className="layout__main">

        {/* ── TOP BAR ──────────────────────────────────────────
            # The horizontal bar at the top of every page      */}
        <header className="topbar">

          {/* # Hamburger button — only visible on mobile */}
          <button
            className="topbar__menu-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label="Toggle sidebar"
          >
            {/* # Show X when open, hamburger when closed */}
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* # Current page title shown in topbar */}
          <h1 className="topbar__title">{pageTitle}</h1>

          {/* # Right side of topbar */}
          <div className="topbar__right">

            {/* # Live indicator dot */}
            <div className="topbar__live">
              <span className="topbar__live-dot" />
              <span>Live</span>
            </div>

            {/* # User avatar circle */}
            <div className="topbar__avatar">
              HR
            </div>

          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────
            # Outlet renders the current page component
            # Dashboard / Jobs / Candidates / Schedule          */}
        <main className="layout__content">
          <Outlet />
        </main>

      </div>
    </div>
  );
}

export default Layout;