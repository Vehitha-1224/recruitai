import React from 'react';
import {
  Mail, Briefcase, Star,
  ChevronRight, Trash2, Clock
} from 'lucide-react';
import { candidatesAPI } from '../services/api';
import toast from 'react-hot-toast';
import './CandidateCard.css';

// ─── STATUS CONFIG ────────────────────────────────────────────────
// # Maps each status to a badge CSS class and display label
const STATUS_CONFIG = {
  applied:    { badge: 'badge-applied',    label: 'Applied'    },
  screening:  { badge: 'badge-screening',  label: 'Screening'  },
  interview:  { badge: 'badge-interview',  label: 'Interview'  },
  offered:    { badge: 'badge-offered',    label: 'Offered'    },
  hired:      { badge: 'badge-hired',      label: 'Hired'      },
  rejected:   { badge: 'badge-rejected',   label: 'Rejected'   },
};

// ─── SCORE COLOUR ─────────────────────────────────────────────────
// # Returns colour based on AI match score
// # 80+ = green, 60-79 = orange, below 60 = red
const getScoreColor = (score) => {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
};

// ─── PROPS ────────────────────────────────────────────────────────
// # candidate  → the candidate data object
// # onDelete   → called after successful delete
// # onView     → called when user clicks to view full profile
// # onStatusChange → called after status update
function CandidateCard({ candidate, onDelete, onView, onStatusChange }) {

  const {
    id,
    name,
    email,
    ai_score,
    status,
    job_title,       // # Which job they applied for
    skills = [],     // # Default to empty array if no skills
    applied_at,
  } = candidate;

  // # Get display config for current status
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.applied;

  // ── HANDLE STATUS CHANGE ─────────────────────────────────────
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await candidatesAPI.updateStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      // # Tell parent to refresh the list
      if (onStatusChange) onStatusChange(id, newStatus);
    } catch {
      // # Error toast handled by api.js interceptor
    }
  };

  // ── HANDLE DELETE ────────────────────────────────────────────
  const handleDelete = async () => {
    // # Ask for confirmation before deleting
    if (!window.confirm(`Remove ${name} from candidates?`)) return;
    try {
      await candidatesAPI.delete(id);
      toast.success(`${name} removed`);
      if (onDelete) onDelete(id);
    } catch {
      // # Error toast handled by api.js interceptor
    }
  };

  // ── FORMAT DATE ──────────────────────────────────────────────
  // # Convert ISO date to readable format
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="candidate-card">

      {/* ── TOP ROW — Name + Score ──────────────────────────── */}
      <div className="candidate-card__top">

        {/* # Candidate initials avatar */}
        <div className="candidate-card__avatar">
          {name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="candidate-card__info">
          <h3 className="candidate-card__name">{name}</h3>
          <a
            href={`mailto:${email}`}
            className="candidate-card__email"
          >
            <Mail size={12} /> {email}
          </a>
        </div>

        {/* # AI Match Score circle */}
        <div
          className="candidate-card__score"
          style={{ '--score-color': getScoreColor(ai_score) }}
          title={`AI Match Score: ${ai_score}%`}
        >
          <span className="candidate-card__score-number">{ai_score ?? '--'}</span>
          <span className="candidate-card__score-label">%</span>
        </div>

      </div>

      {/* ── JOB APPLIED FOR ─────────────────────────────────── */}
      {job_title && (
        <div className="candidate-card__job">
          <Briefcase size={13} />
          <span>{job_title}</span>
        </div>
      )}

      {/* ── SKILLS TAGS ─────────────────────────────────────── */}
      {skills.length > 0 && (
        <div className="candidate-card__skills">
          {/* # Show first 4 skills only to save space */}
          {skills.slice(0, 4).map((skill, i) => (
            <span key={i} className="candidate-card__skill-tag">
              {skill}
            </span>
          ))}
          {/* # Show "+N more" if there are extra skills */}
          {skills.length > 4 && (
            <span className="candidate-card__skill-more">
              +{skills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* ── BOTTOM ROW — Status + Date + Actions ────────────── */}
      <div className="candidate-card__bottom">

        {/* # Status dropdown — HR can change stage here */}
        <div className="candidate-card__status-wrapper">
          <span className={`badge ${statusConfig.badge}`}>
            {statusConfig.label}
          </span>
          <select
            className="candidate-card__status-select"
            value={status}
            onChange={handleStatusChange}
            title="Change status"
          >
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* # Applied date */}
        <div className="candidate-card__date">
          <Clock size={12} />
          <span>{formatDate(applied_at)}</span>
        </div>

        {/* # Action buttons */}
        <div className="candidate-card__actions">

          {/* # View full profile */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onView && onView(candidate)}
            title="View profile"
          >
            <ChevronRight size={16} />
          </button>

          {/* # Delete candidate */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            title="Remove candidate"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={16} />
          </button>

        </div>
      </div>

    </div>
  );
}

export default CandidateCard;