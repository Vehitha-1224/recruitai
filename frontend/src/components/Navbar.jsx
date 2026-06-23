// # This component is the top search + action bar
// # used inside pages — NOT the sidebar
import React, { useState } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import './Navbar.css';

// ─── PROPS ───────────────────────────────────────────────────────
// # onSearch     → function called when user types in search box
// # onAddClick   → function called when + button is clicked
// # addLabel     → text on the + button e.g. "Add Job"
// # placeholder  → search box hint text
// # notifications → array of notification messages
function Navbar({
  onSearch,
  onAddClick,
  addLabel = 'Add New',
  placeholder = 'Search...',
  notifications = [],
}) {
  // # Tracks what user typed in search box
  const [searchValue, setSearchValue] = useState('');

  // # Controls notification dropdown open/close
  const [notifOpen, setNotifOpen] = useState(false);

  // # When user types — update state AND call parent's onSearch
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    // # Only call if parent passed a handler
    if (onSearch) onSearch(value);
  };

  // # Clear search box
  const handleClear = () => {
    setSearchValue('');
    if (onSearch) onSearch('');
  };

  return (
    <div className="navbar">

      {/* ── SEARCH BOX ─────────────────────────────────────────*/}
      <div className="navbar__search">
        {/* # Search icon inside the box */}
        <Search size={16} className="navbar__search-icon" />

        <input
          type="text"
          className="navbar__search-input"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleSearchChange}
        />

        {/* # Show clear X button only when there is text */}
        {searchValue && (
          <button
            className="navbar__search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* ── RIGHT SIDE ACTIONS ─────────────────────────────────*/}
      <div className="navbar__actions">

        {/* ── NOTIFICATION BELL ────────────────────────────────
            # Shows red dot when there are notifications        */}
        <div className="navbar__notif-wrapper">
          <button
            className="navbar__icon-btn"
            onClick={() => setNotifOpen(prev => !prev)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {/* # Red badge — only shows when notifications exist */}
            {notifications.length > 0 && (
              <span className="navbar__notif-badge">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {/* # Dropdown list of notifications */}
          {notifOpen && (
            <div className="navbar__notif-dropdown">
              <p className="navbar__notif-title">Notifications</p>

              {notifications.length === 0 ? (
                <p className="navbar__notif-empty">No new notifications</p>
              ) : (
                notifications.map((notif, index) => (
                  <div key={index} className="navbar__notif-item">
                    <span className="navbar__notif-dot" />
                    <p>{notif}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── ADD BUTTON ───────────────────────────────────────
            # Only shows if parent passes onAddClick handler    */}
        {onAddClick && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onAddClick}
          >
            <Plus size={16} />
            {addLabel}
          </button>
        )}

      </div>
    </div>
  );
}

export default Navbar;